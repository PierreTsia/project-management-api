import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectContributor } from './entities/project-contributor.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddContributorDto } from './dto/add-contributor.dto';
import { UpdateContributorRoleDto } from './dto/update-contributor-role.dto';
import { SearchProjectsDto } from './dto/search-projects.dto';
import { I18nService } from 'nestjs-i18n';
import { CustomLogger } from '../common/services/logger.service';
import { ProjectRole } from './enums/project-role.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectContributor)
    private readonly projectContributorRepository: Repository<ProjectContributor>,
    private readonly i18n: I18nService,
    private readonly logger: CustomLogger,
    private readonly usersService: UsersService,
  ) {
    this.logger.setContext('ProjectsService');
  }

  async create(
    createProjectDto: CreateProjectDto,
    ownerId: string,
  ): Promise<Project> {
    this.logger.debug(
      `Creating new project "${createProjectDto.name}" for user ${ownerId}`,
    );

    const project = this.projectsRepository.create({
      ...createProjectDto,
      ownerId,
      status: ProjectStatus.ACTIVE,
    });

    const savedProject = await this.projectsRepository.save(project);

    // Create contributor record with OWNER role
    const contributor = this.projectContributorRepository.create({
      userId: ownerId,
      projectId: savedProject.id,
      role: ProjectRole.OWNER,
    });

    await this.projectContributorRepository.save(contributor);

    this.logger.log(`Project created successfully with id: ${savedProject.id}`);
    return savedProject;
  }

  async findAll(userId: string): Promise<Project[]> {
    this.logger.debug(`Finding all projects for user ${userId}`);

    // Get all project IDs where user is owner or contributor
    const userProjects = await this.projectContributorRepository
      .createQueryBuilder('contributor')
      .select('contributor.projectId')
      .where('contributor.userId = :userId', { userId })
      .getMany();

    const userProjectIds = userProjects.map((c) => c.projectId);

    // Also include projects where user is the owner
    const ownedProjects = await this.projectsRepository
      .createQueryBuilder('project')
      .select('project.id')
      .where('project.ownerId = :userId', { userId })
      .getMany();

    const ownedProjectIds = ownedProjects.map((p) => p.id);

    // Combine both sets of project IDs (remove duplicates)
    const accessibleProjectIds = [
      ...new Set([...userProjectIds, ...ownedProjectIds]),
    ];

    if (accessibleProjectIds.length === 0) {
      // User has no accessible projects
      return [];
    }

    return await this.projectsRepository.find({
      where: { id: In(accessibleProjectIds) },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    userId: string,
    acceptLanguage?: string,
  ): Promise<Project> {
    // First check if user is owner
    let project = await this.projectsRepository.findOne({
      where: { id, ownerId: userId },
      relations: ['owner'],
    });

    // If not owner, check if user is contributor
    if (!project) {
      const contributor = await this.projectContributorRepository.findOne({
        where: { projectId: id, userId },
      });

      if (contributor) {
        // User is contributor, get the project
        project = await this.projectsRepository.findOne({
          where: { id },
          relations: ['owner'],
        });
      }
    }

    if (!project) {
      this.logger.warn(`Project not found with id: ${id} for user ${userId}`);
      throw new NotFoundException({
        status: 404,
        code: 'PROJECT.NOT_FOUND',
        message: this.i18n.translate('errors.project.not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    return project;
  }
  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    ownerId: string,
    acceptLanguage?: string,
  ): Promise<Project> {
    await this.validateProjectOwnership(id, ownerId, acceptLanguage);

    this.logger.debug(
      `Updating project ${id} with data: ${JSON.stringify(updateProjectDto)}`,
    );

    await this.projectsRepository.update(id, updateProjectDto);
    const updatedProject = await this.findOne(id, ownerId, acceptLanguage);

    this.logger.log(`Project ${id} updated successfully`);
    return updatedProject;
  }

  async remove(
    id: string,
    ownerId: string,
    acceptLanguage?: string,
  ): Promise<void> {
    const project = await this.validateProjectOwnership(
      id,
      ownerId,
      acceptLanguage,
    );

    this.logger.debug(`Deleting project ${id} for user ${ownerId}`);
    await this.projectsRepository.remove(project);
    this.logger.log(`Project ${id} deleted successfully`);
  }

  async archive(
    id: string,
    ownerId: string,
    acceptLanguage?: string,
  ): Promise<Project> {
    await this.validateProjectOwnership(id, ownerId, acceptLanguage);

    this.logger.debug(`Archiving project ${id} for user ${ownerId}`);
    await this.projectsRepository.update(id, {
      status: ProjectStatus.ARCHIVED,
    });
    const archivedProject = await this.findOne(id, ownerId, acceptLanguage);

    this.logger.log(`Project ${id} archived successfully`);
    return archivedProject;
  }

  async activate(
    id: string,
    ownerId: string,
    acceptLanguage?: string,
  ): Promise<Project> {
    await this.validateProjectOwnership(id, ownerId, acceptLanguage);

    this.logger.debug(`Activating project ${id} for user ${ownerId}`);
    await this.projectsRepository.update(id, { status: ProjectStatus.ACTIVE });
    const activatedProject = await this.findOne(id, ownerId, acceptLanguage);

    this.logger.log(`Project ${id} activated successfully`);
    return activatedProject;
  }

  private async validateProjectOwnership(
    id: string,
    ownerId: string,
    acceptLanguage?: string,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id, ownerId },
      relations: ['owner'],
    });

    if (!project) {
      this.logger.warn(`Project not found with id: ${id} for user ${ownerId}`);
      throw new NotFoundException({
        status: 404,
        code: 'PROJECT.NOT_FOUND',
        message: this.i18n.translate('errors.project.not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    return project;
  }

  async getContributors(
    projectId: string,
    _acceptLanguage?: string,
  ): Promise<ProjectContributor[]> {
    this.logger.debug(`Getting contributors for project ${projectId}`);
    const contributors = await this.projectContributorRepository.find({
      where: { projectId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    if (!contributors.length) {
      this.logger.warn(`No contributors found for project ${projectId}`);
    }

    return contributors;
  }

  private async ensureProjectExists(
    projectId: string,
    acceptLanguage?: string,
  ): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
      relations: ['owner'],
    });
    if (!project) {
      this.logger.warn(`Project not found with id: ${projectId}`);
      throw new NotFoundException({
        status: 404,
        code: 'PROJECT.NOT_FOUND',
        message: this.i18n.translate('errors.project.not_found', {
          lang: acceptLanguage,
        }),
      });
    }
    return project;
  }

  async addContributor(
    projectId: string,
    addContributorDto: AddContributorDto,
    acceptLanguage?: string,
  ): Promise<ProjectContributor> {
    // Check that the project exists
    await this.ensureProjectExists(projectId, acceptLanguage);

    this.logger.debug(
      `Adding contributor ${addContributorDto.email} to project ${projectId} with role ${addContributorDto.role}`,
    );

    // Find the user by email
    const user = await this.usersService.findByEmail(addContributorDto.email);
    if (!user) {
      this.logger.warn(`User not found with email: ${addContributorDto.email}`);
      throw new NotFoundException({
        status: 404,
        code: 'USER.NOT_FOUND',
        message: this.i18n.translate('errors.project.user_not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    // Check if user is already a contributor
    const existingContributor = await this.projectContributorRepository.findOne(
      {
        where: { projectId, userId: user.id },
      },
    );

    if (existingContributor) {
      this.logger.warn(
        `User ${user.id} is already a contributor to project ${projectId}`,
      );
      throw new BadRequestException({
        status: 400,
        code: 'CONTRIBUTOR.ALREADY_EXISTS',
        message: this.i18n.translate(
          'errors.project.contributor_already_exists',
          {
            lang: acceptLanguage,
          },
        ),
      });
    }

    // Create new contributor
    const contributor = this.projectContributorRepository.create({
      userId: user.id,
      projectId,
      role: addContributorDto.role,
    });

    const savedContributor =
      await this.projectContributorRepository.save(contributor);

    // Load the contributor with user relation for the response
    const contributorWithUser = await this.projectContributorRepository.findOne(
      {
        where: { id: savedContributor.id },
        relations: ['user'],
      },
    );

    this.logger.log(
      `Added contributor ${user.id} with role ${addContributorDto.role} to project ${projectId}`,
    );

    return contributorWithUser;
  }

  async updateContributorRole(
    projectId: string,
    contributorId: string,
    updateRoleDto: UpdateContributorRoleDto,
    acceptLanguage?: string,
  ): Promise<ProjectContributor> {
    this.logger.debug(
      `Updating contributor ${contributorId} role to ${updateRoleDto.role} in project ${projectId}`,
    );

    // Check that the project exists
    await this.ensureProjectExists(projectId, acceptLanguage);

    const contributor = await this.projectContributorRepository.findOne({
      where: { id: contributorId, projectId },
      relations: ['user'],
    });

    if (!contributor) {
      this.logger.warn(
        `Contributor ${contributorId} not found in project ${projectId}`,
      );
      throw new NotFoundException({
        status: 404,
        code: 'CONTRIBUTOR.NOT_FOUND',
        message: this.i18n.translate('errors.project.contributor_not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    // Prevent changing owner's role
    if (contributor.role === ProjectRole.OWNER) {
      this.logger.warn(
        `Attempted to change owner's role in project ${projectId}`,
      );
      throw new BadRequestException({
        status: 400,
        code: 'CONTRIBUTOR.CANNOT_CHANGE_OWNER_ROLE',
        message: this.i18n.translate(
          'errors.project.cannot_change_owner_role',
          {
            lang: acceptLanguage,
          },
        ),
      });
    }

    // Update the role
    await this.projectContributorRepository.update(contributorId, {
      role: updateRoleDto.role,
    });

    const updatedContributor = await this.projectContributorRepository.findOne({
      where: { id: contributorId },
      relations: ['user'],
    });

    this.logger.log(
      `Updated contributor ${contributorId} role to ${updateRoleDto.role} in project ${projectId}`,
    );

    return updatedContributor;
  }

  async removeContributor(
    projectId: string,
    contributorId: string,
    acceptLanguage?: string,
  ): Promise<void> {
    this.logger.debug(
      `Removing contributor ${contributorId} from project ${projectId}`,
    );

    // Check that the project exists
    await this.ensureProjectExists(projectId, acceptLanguage);

    const contributor = await this.projectContributorRepository.findOne({
      where: { id: contributorId, projectId },
    });

    if (!contributor) {
      this.logger.warn(
        `Contributor ${contributorId} not found in project ${projectId}`,
      );
      throw new NotFoundException({
        status: 404,
        code: 'CONTRIBUTOR.NOT_FOUND',
        message: this.i18n.translate('errors.project.contributor_not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    // Prevent removing the owner
    if (contributor.role === ProjectRole.OWNER) {
      this.logger.warn(`Attempted to remove owner from project ${projectId}`);
      throw new BadRequestException({
        status: 400,
        code: 'CONTRIBUTOR.CANNOT_REMOVE_OWNER',
        message: this.i18n.translate('errors.project.cannot_remove_owner', {
          lang: acceptLanguage,
        }),
      });
    }

    // Check if this is the last admin (if removing an admin)
    if (contributor.role === ProjectRole.ADMIN) {
      const adminCount = await this.projectContributorRepository.count({
        where: { projectId, role: ProjectRole.ADMIN },
      });

      if (adminCount <= 1) {
        this.logger.warn(
          `Attempted to remove the last admin from project ${projectId}`,
        );
        throw new BadRequestException({
          status: 400,
          code: 'CONTRIBUTOR.CANNOT_REMOVE_LAST_ADMIN',
          message: this.i18n.translate(
            'errors.project.cannot_remove_last_admin',
            {
              lang: acceptLanguage,
            },
          ),
        });
      }
    }

    await this.projectContributorRepository.remove(contributor);

    this.logger.log(
      `Removed contributor ${contributorId} from project ${projectId}`,
    );
  }

  async searchProjects(
    userId: string,
    searchDto: SearchProjectsDto,
  ): Promise<{
    projects: Project[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.debug(
      `Searching projects for user ${userId} with filters: ${JSON.stringify(
        searchDto,
      )}`,
    );

    // Get all project IDs where user is owner or contributor with READ role or higher
    const userProjects = await this.projectContributorRepository
      .createQueryBuilder('contributor')
      .select('contributor.projectId')
      .where('contributor.userId = :userId', { userId })
      .getMany();

    const userProjectIds = userProjects.map((c) => c.projectId);

    // Also include projects where user is the owner
    const ownedProjects = await this.projectsRepository
      .createQueryBuilder('project')
      .select('project.id')
      .where('project.ownerId = :userId', { userId })
      .getMany();

    const ownedProjectIds = ownedProjects.map((p) => p.id);

    // Combine both sets of project IDs (remove duplicates)
    const accessibleProjectIds = [
      ...new Set([...userProjectIds, ...ownedProjectIds]),
    ];

    if (accessibleProjectIds.length === 0) {
      // User has no accessible projects
      return {
        projects: [],
        total: 0,
        page: searchDto.page,
        limit: searchDto.limit,
      };
    }

    const queryBuilder = this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .where('project.id IN (:...projectIds)', {
        projectIds: accessibleProjectIds,
      });

    // Text search (case-insensitive)
    if (searchDto.query) {
      queryBuilder.andWhere(
        '(project.name ILIKE :query OR project.description ILIKE :query)',
        { query: `%${searchDto.query}%` },
      );
    }

    // Status filter
    if (searchDto.status) {
      queryBuilder.andWhere('project.status = :status', {
        status: searchDto.status,
      });
    }

    // Pagination
    const skip = (searchDto.page - 1) * searchDto.limit;
    queryBuilder.skip(skip).take(searchDto.limit);

    // Order by creation date (newest first)
    queryBuilder.orderBy('project.createdAt', 'DESC');

    const [projects, total] = await queryBuilder.getManyAndCount();

    this.logger.log(
      `Found ${projects.length} projects out of ${total} total for user ${userId}`,
    );

    return {
      projects,
      total,
      page: searchDto.page,
      limit: searchDto.limit,
    };
  }
}
