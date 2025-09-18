import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './projects/entities/project.entity';
import { ProjectContributor } from './projects/entities/project-contributor.entity';
import { CustomLogger } from './common/services/logger.service';
import type { ContributorAggregateResponseDto } from './dto/contributor-aggregate-response.dto';
import type { ContributorProjectsResponseDto } from './dto/contributor-projects-response.dto';

@Injectable()
export class ContributorsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectContributor)
    private readonly projectContributorRepository: Repository<ProjectContributor>,
    private readonly logger: CustomLogger,
  ) {}

  /**
   * Return an aggregated list of contributors accessible to the current user.
   * Placeholder implementation for scaffold.
   */
  public async listContributors(
    viewerUserId: string,
  ): Promise<ContributorAggregateResponseDto[]> {
    this.logger.debug(`Listing contributors for viewer ${viewerUserId}`);

    // Get accessible project ids (owned or contributor)
    const projectIdsResult = await this.projectContributorRepository
      .createQueryBuilder('pc_viewer')
      .select('pc_viewer.projectId', 'projectId')
      .where('pc_viewer.userId = :viewerUserId', { viewerUserId })
      .getRawMany<{ projectId: string }>();

    const projectIds = projectIdsResult.map((r) => r.projectId);
    if (projectIds.length === 0) {
      return [];
    }

    // Fetch contributors for those projects with user info
    const rows = await this.projectContributorRepository
      .createQueryBuilder('pc')
      .leftJoinAndSelect('pc.user', 'user')
      .leftJoinAndSelect('pc.project', 'project')
      .where('pc.projectId IN (:...projectIds)', { projectIds })
      .getMany();

    // Aggregate by userId (functional, immutable style)
    const byUser = rows
      .filter((pc) => pc.user)
      .reduce((acc, pc) => {
        const user = pc.user!;
        const key = user.id;
        const project = pc.project;

        const current: ContributorAggregateResponseDto = acc.get(key) ?? {
          user: {
            id: user.id,
            name: user.name ?? null,
            email: user.email,
            avatarUrl: user.avatarUrl ?? null,
          },
          projectsCount: 0,
          projectsPreview: [],
          projectsOverflowCount: 0,
          roles: [],
        };

        const roles = Array.from(new Set([...current.roles, pc.role]));

        const projectsPreview = project
          ? [
              ...current.projectsPreview,
              { id: project.id, name: project.name, role: pc.role },
            ]
          : current.projectsPreview;

        const projectsOverflowCount = current.projectsOverflowCount;

        acc.set(key, {
          ...current,
          projectsCount: current.projectsCount + 1,
          projectsPreview,
          projectsOverflowCount,
          roles,
        });
        return acc;
      }, new Map<string, ContributorAggregateResponseDto>());

    return Array.from(byUser.values());
  }

  /**
   * Return shared projects for a given contributor.
   * Placeholder implementation for scaffold.
   */
  public async listContributorProjects(
    targetUserId: string,
    viewerUserId: string,
  ): Promise<ContributorProjectsResponseDto[]> {
    this.logger.debug(`Listing contributor projects for ${targetUserId}`);

    // Compute viewer accessible projects
    const accessible = await this.projectContributorRepository
      .createQueryBuilder('pc_viewer')
      .select('pc_viewer.projectId', 'projectId')
      .where('pc_viewer.userId = :viewerUserId', { viewerUserId })
      .getRawMany<{ projectId: string }>();
    const projectIds = accessible.map((r) => r.projectId);
    if (projectIds.length === 0) {
      return [];
    }

    // Intersect with target user's contributions
    const rows = await this.projectContributorRepository
      .createQueryBuilder('pc')
      .leftJoinAndSelect('pc.project', 'project')
      .where('pc.userId = :targetUserId', { targetUserId })
      .andWhere('pc.projectId IN (:...projectIds)', { projectIds })
      .getMany();

    return rows
      .map((pc) => ({
        projectId: pc.projectId,
        name: pc.project?.name ?? '',
        role: pc.role,
      }))
      .filter((r) => !!r.projectId);
  }
}
