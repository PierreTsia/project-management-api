import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './projects/entities/project.entity';
import { ProjectContributor } from './projects/entities/project-contributor.entity';
import { CustomLogger } from './common/services/logger.service';
import type { ContributorAggregateResponseDto } from './dto/contributor-aggregate-response.dto';
import type { ContributorsListResponseDto } from './dto/contributors-list-response.dto';
import { ProjectRole } from './projects/enums/project-role.enum';
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

  // Set a clear logging context to avoid ambiguous/undefined log lines
  private readonly context: string = 'ContributorsService';

  /**
   * Return an aggregated list of contributors accessible to the current user.
   * Placeholder implementation for scaffold.
   */
  public async listContributors(
    viewerUserId: string,
    query?: {
      q?: string;
      role?: ProjectRole;
      projectId?: string;
      page?: string;
      pageSize?: string;
      sort?: 'name' | 'joinedAt' | 'projectsCount';
      order?: 'asc' | 'desc';
    },
    _acceptLanguage?: string,
  ): Promise<ContributorsListResponseDto> {
    this.logger.debug(
      `Listing contributors for viewer ${viewerUserId}`,
      this.context,
    );

    // Get accessible project ids (owned or contributor)
    const projectIdsResult = await this.projectContributorRepository
      .createQueryBuilder('pc_viewer')
      .select('pc_viewer.projectId', 'projectId')
      .where('pc_viewer.userId = :viewerUserId', { viewerUserId })
      .getRawMany<{ projectId: string }>();

    const projectIds = projectIdsResult.map((r) => r.projectId);
    const page = Number(query?.page ?? 1);
    const limit = Number(query?.pageSize ?? 20);
    if (projectIds.length === 0) {
      return { contributors: [], total: 0, page, limit };
    }

    // Build a query to find distinct user ids matching filters (for correct totals)
    const userIdQb = this.projectContributorRepository
      .createQueryBuilder('pc')
      .leftJoin('pc.user', 'user')
      .where('pc.projectId IN (:...projectIds)', { projectIds })
      .andWhere('user.id != :viewerUserId', { viewerUserId });

    if (query?.projectId) {
      userIdQb.andWhere('pc.projectId = :projectId', {
        projectId: query.projectId,
      });
    }
    if (query?.role) {
      userIdQb.andWhere('pc.role = :role', { role: query.role });
    }
    if (query?.q) {
      userIdQb.andWhere('(user.name ILIKE :q OR user.email ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }

    const sort = query?.sort ?? 'name';
    const order = query?.order ?? 'asc';
    if (sort === 'name') {
      // When using DISTINCT, Postgres requires ORDER BY expressions to be in the select list
      userIdQb
        .addSelect('user.name', 'userName')
        .orderBy('user.name', order.toUpperCase() as 'ASC' | 'DESC');
    } else if (sort === 'joinedAt') {
      // Include joinedAt in select list to satisfy DISTINCT + ORDER BY constraint
      userIdQb
        .addSelect('pc.joinedAt', 'joinedAt')
        .orderBy('pc.joinedAt', order.toUpperCase() as 'ASC' | 'DESC');
    }

    const skip = (page - 1) * limit;
    // Ensure we do not override previously added selects (name/joinedAt) by using addSelect here
    const distinctUserIdsRaw = await userIdQb
      .distinct(true)
      .addSelect('user.id', 'userId')
      .getRawMany<{ userId: string }>();
    const allUserIds = distinctUserIdsRaw.map((r) => r.userId);
    const total = allUserIds.length;
    const pagedUserIds = allUserIds.slice(skip, skip + limit);
    if (pagedUserIds.length === 0) {
      return { contributors: [], total, page, limit };
    }

    // Fetch all contributions for paged user ids
    const rowsRaw = await this.projectContributorRepository
      .createQueryBuilder('pc')
      .leftJoinAndSelect('pc.user', 'user')
      .leftJoinAndSelect('pc.project', 'project')
      .where('pc.projectId IN (:...projectIds)', { projectIds })
      .andWhere('user.id IN (:...pagedUserIds)', { pagedUserIds })
      .getMany();

    // Aggregate by userId (functional, immutable style)
    const byUser = rowsRaw
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
          roles: [],
        };

        const roles = Array.from(new Set([...current.roles, pc.role]));

        const projectsPreview = project
          ? [
              ...current.projectsPreview,
              { id: project.id, name: project.name, role: pc.role },
            ]
          : current.projectsPreview;

        acc.set(key, {
          ...current,
          projectsCount: current.projectsCount + 1,
          projectsPreview,
          roles,
        });
        return acc;
      }, new Map<string, ContributorAggregateResponseDto>());

    let contributors = Array.from(byUser.values());
    // Post-aggregation sort for projectsCount
    if (sort === 'projectsCount') {
      contributors = contributors.sort((a, b) =>
        order === 'asc'
          ? a.projectsCount - b.projectsCount
          : b.projectsCount - a.projectsCount,
      );
    }
    return { contributors, total, page, limit };
  }

  /**
   * Return shared projects for a given contributor.
   * Placeholder implementation for scaffold.
   */
  public async listContributorProjects(
    targetUserId: string,
    viewerUserId: string,
    _acceptLanguage?: string,
  ): Promise<ContributorProjectsResponseDto[]> {
    this.logger.debug(
      `Listing contributor projects for ${targetUserId}`,
      this.context,
    );

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
