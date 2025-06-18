import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { I18nService } from 'nestjs-i18n';
import { CustomLogger } from '../common/services/logger.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    private readonly i18n: I18nService,
    private readonly logger: CustomLogger,
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
    this.logger.log(`Project created successfully with id: ${savedProject.id}`);
    return savedProject;
  }

  async findAll(ownerId: string): Promise<Project[]> {
    this.logger.debug(`Finding all projects for user ${ownerId}`);
    return this.projectsRepository.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
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
}
