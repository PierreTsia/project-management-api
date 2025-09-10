import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { Task } from '../../tasks/entities/task.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectContributor } from '../../projects/entities/project-contributor.entity';
import { TaskStatus } from '../../tasks/enums/task-status.enum';
import { TaskPriority } from '../../tasks/enums/task-priority.enum';
import { ProjectStatus } from '../../projects/entities/project.entity';
import { ProjectsService } from '../../projects/projects.service';
import {
  DashboardSummaryDto,
  ActivityItem,
} from '../dto/dashboard-summary.dto';
import { DashboardTaskDto } from '../dto/dashboard-task.dto';
import { DashboardProjectDto } from '../dto/dashboard-project.dto';
import { DashboardQueryDto } from '../dto/dashboard-query.dto';
import { CustomLogger } from '../../common/services/logger.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectContributor)
    private readonly projectContributorRepository: Repository<ProjectContributor>,
    private readonly projectsService: ProjectsService,
    private readonly i18n: I18nService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('DashboardService');
  }

  async getDashboardSummary(userId: string): Promise<DashboardSummaryDto> {
    this.logger.debug(`Getting dashboard summary for user ${userId}`);

    // Get user's accessible projects
    const projects = await this.projectsService.findAll(userId);
    const projectIds = projects.map((p) => p.id);

    if (projectIds.length === 0) {
      return this.getEmptySummary();
    }

    // Get task statistics
    const taskStats = await this.getTaskStatistics(userId, projectIds);

    // Get project statistics
    const projectStats = this.calculateProjectStats(projects);

    // Get recent activity
    const recentActivity = await this.getRecentActivity(userId, projectIds);

    // Calculate derived metrics
    const completionRate =
      taskStats.totalTasks > 0
        ? (taskStats.completedTasks / taskStats.totalTasks) * 100
        : 0;

    const averageTasksPerProject =
      projectIds.length > 0 ? taskStats.totalTasks / projectIds.length : 0;

    const summary: DashboardSummaryDto = {
      ...projectStats,
      ...taskStats,
      completionRate: Math.round(completionRate * 100) / 100,
      averageTasksPerProject: Math.round(averageTasksPerProject * 100) / 100,
      recentActivity,
    };

    this.logger.log(`Dashboard summary generated for user ${userId}`);
    return summary;
  }

  async getUserTasks(
    userId: string,
    query: DashboardQueryDto,
  ): Promise<DashboardTaskDto[]> {
    this.logger.debug(
      `Getting user tasks for user ${userId} with query:`,
      JSON.stringify(query),
    );

    // Get user's accessible projects
    const projects = await this.projectsService.findAll(userId);
    const projectIds = projects.map((p) => p.id);

    if (projectIds.length === 0) {
      return [];
    }

    // Build query
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.project', 'project')
      .where('task.assigneeId = :userId', { userId })
      .andWhere('task.projectId IN (:...projectIds)', { projectIds });

    // Apply filters
    if (query.status) {
      queryBuilder.andWhere('task.status = :status', { status: query.status });
    }

    if (query.priority) {
      queryBuilder.andWhere('task.priority = :priority', {
        priority: query.priority,
      });
    }

    if (query.projectId) {
      queryBuilder.andWhere('task.projectId = :projectId', {
        projectId: query.projectId,
      });
    }

    if (query.dueDateFrom) {
      queryBuilder.andWhere('task.dueDate >= :dueDateFrom', {
        dueDateFrom: query.dueDateFrom,
      });
    }

    if (query.dueDateTo) {
      queryBuilder.andWhere('task.dueDate <= :dueDateTo', {
        dueDateTo: query.dueDateTo,
      });
    }

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const tasks = await queryBuilder.getMany();

    return tasks.map((task) => this.mapTaskToDto(task));
  }

  async getUserProjects(userId: string): Promise<DashboardProjectDto[]> {
    this.logger.debug(`Getting user projects for user ${userId}`);

    const projects = await this.projectsService.findAll(userId);

    if (projects.length === 0) {
      return [];
    }

    // Get project IDs for efficient querying
    const projectIds = projects.map((p) => p.id);

    // Load projects with owner relation
    const projectsWithOwner = await this.projectRepository.find({
      where: { id: In(projectIds) },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });

    // Fetch all contributors for this user and these projects in one query
    const contributors = await this.projectContributorRepository.find({
      where: { userId, projectId: In(projectIds) },
    });

    // Create a map for quick lookup by projectId
    const contributorMap = new Map<string, ProjectContributor>();
    for (const contributor of contributors) {
      contributorMap.set(contributor.projectId, contributor);
    }

    // Get all task counts in a single query
    const taskCounts = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.projectId', 'projectId')
      .addSelect('COUNT(*)', 'totalCount')
      .addSelect(
        'COUNT(CASE WHEN task.assigneeId = :userId THEN 1 END)',
        'assignedCount',
      )
      .where('task.projectId IN (:...projectIds)', { projectIds })
      .setParameters({ userId })
      .groupBy('task.projectId')
      .getRawMany();

    // Create a map for task counts lookup
    const taskCountMap = new Map<
      string,
      { totalCount: number; assignedCount: number }
    >();
    for (const count of taskCounts) {
      taskCountMap.set(count.projectId, {
        totalCount: parseInt(count.totalCount),
        assignedCount: parseInt(count.assignedCount),
      });
    }

    const projectDtos: DashboardProjectDto[] = [];

    for (const project of projectsWithOwner) {
      // Get user role in project from map
      const contributor = contributorMap.get(project.id);

      // Get task counts from map
      const counts = taskCountMap.get(project.id) || {
        totalCount: 0,
        assignedCount: 0,
      };

      projectDtos.push({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        owner: {
          id: project.owner.id,
          name: project.owner.name,
        },
        userRole: contributor?.role || 'OWNER',
        taskCount: counts.totalCount,
        assignedTaskCount: counts.assignedCount,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    }

    return projectDtos;
  }

  private async getTaskStatistics(userId: string, projectIds: string[]) {
    const baseQuery = this.taskRepository
      .createQueryBuilder('task')
      .where('task.projectId IN (:...projectIds)', { projectIds });

    const [
      totalTasks,
      assignedTasks,
      completedTasks,
      overdueTasks,
      tasksByStatus,
      tasksByPriority,
    ] = await Promise.all([
      baseQuery.getCount(),

      baseQuery
        .clone()
        .andWhere('task.assigneeId = :userId', { userId })
        .getCount(),

      baseQuery
        .clone()
        .andWhere('task.status = :status', { status: TaskStatus.DONE })
        .getCount(),

      baseQuery
        .clone()
        .andWhere('task.dueDate < NOW()')
        .andWhere('task.status != :status', { status: TaskStatus.DONE })
        .getCount(),

      this.getTasksByStatus(projectIds),
      this.getTasksByPriority(projectIds),
    ]);

    return {
      totalTasks,
      assignedTasks,
      completedTasks,
      overdueTasks,
      tasksByStatus,
      tasksByPriority,
    };
  }

  private async getTasksByStatus(projectIds: string[]) {
    const result = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('task.projectId IN (:...projectIds)', { projectIds })
      .groupBy('task.status')
      .getRawMany();

    const statusCounts = {
      todo: 0,
      inProgress: 0,
      done: 0,
    };

    result.forEach((row) => {
      switch (row.status) {
        case TaskStatus.TODO:
          statusCounts.todo = parseInt(row.count);
          break;
        case TaskStatus.IN_PROGRESS:
          statusCounts.inProgress = parseInt(row.count);
          break;
        case TaskStatus.DONE:
          statusCounts.done = parseInt(row.count);
          break;
      }
    });

    return statusCounts;
  }

  private async getTasksByPriority(projectIds: string[]) {
    const result = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .where('task.projectId IN (:...projectIds)', { projectIds })
      .groupBy('task.priority')
      .getRawMany();

    const priorityCounts = {
      low: 0,
      medium: 0,
      high: 0,
    };

    result.forEach((row) => {
      switch (row.priority) {
        case TaskPriority.LOW:
          priorityCounts.low = parseInt(row.count);
          break;
        case TaskPriority.MEDIUM:
          priorityCounts.medium = parseInt(row.count);
          break;
        case TaskPriority.HIGH:
          priorityCounts.high = parseInt(row.count);
          break;
      }
    });

    return priorityCounts;
  }

  private calculateProjectStats(projects: Project[]) {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(
      (p) => p.status === ProjectStatus.ACTIVE,
    ).length;
    const archivedProjects = projects.filter(
      (p) => p.status === ProjectStatus.ARCHIVED,
    ).length;

    return {
      totalProjects,
      activeProjects,
      archivedProjects,
    };
  }

  private async getRecentActivity(
    _userId: string,
    _projectIds: string[],
  ): Promise<ActivityItem[]> {
    // For now, return a simple mock. In a real implementation, you might want to
    // track activity in a separate table or use audit logs
    return [
      {
        type: 'task_completed',
        description: 'Recent task activity',
        timestamp: new Date(),
      },
    ];
  }

  private getEmptySummary(): DashboardSummaryDto {
    return {
      totalProjects: 0,
      activeProjects: 0,
      archivedProjects: 0,
      totalTasks: 0,
      assignedTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      tasksByStatus: {
        todo: 0,
        inProgress: 0,
        done: 0,
      },
      tasksByPriority: {
        low: 0,
        medium: 0,
        high: 0,
      },
      completionRate: 0,
      averageTasksPerProject: 0,
      recentActivity: [],
    };
  }

  private mapTaskToDto(task: Task): DashboardTaskDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      project: {
        id: task.project.id,
        name: task.project.name,
      },
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            name: task.assignee.name,
          }
        : undefined,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
