import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectSnapshot } from '../entities/project-snapshot.entity';
import { TasksService } from '../../tasks/tasks.service';
import { CommentsService } from '../../tasks/services/comments.service';
import { AttachmentsService } from '../../attachments/attachments.service';
import { CustomLogger } from '../../common/services/logger.service';
import { TaskStatus } from '../../tasks/enums/task-status.enum';
import { DateUtils } from '../../common/utils/date.utils';
import { Prettify } from '../../common/utils/types';
import { ProjectProgressDto } from '../../projects/dto/project-progress.dto';

// Constants
const DEFAULT_PROGRESS_DAYS = 30;
const DEFAULT_COUNT = 0;
const DECIMAL_RADIX = 10;
const PERCENTAGE_MULTIPLIER = 100;

type ProjectMetrics = {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  newTasksToday: number;
  completedTasksToday: number;
};

type ProjectActivityData = {
  commentsAddedToday: number;
  attachmentsUploadedToday: number;
  completionPercentage: number;
};

type ProjectSnapshotData = Prettify<ProjectMetrics & ProjectActivityData>;

@Injectable()
export class ProjectSnapshotService {
  constructor(
    @InjectRepository(ProjectSnapshot)
    private snapshotRepository: Repository<ProjectSnapshot>,
    private tasksService: TasksService,
    private commentsService: CommentsService,
    private attachmentsService: AttachmentsService,
    private logger: CustomLogger,
  ) {
    this.logger.setContext('ProjectSnapshotService');
  }

  /**
   * Generate daily snapshots for all active projects
   * This method is called by a cron job
   */
  async generateDailySnapshots() {
    this.logger.log('Starting daily project snapshots generation...');

    try {
      // Get all active projects
      const projects = await this.snapshotRepository.manager
        .getRepository('projects')
        .find({ where: { status: 'ACTIVE' } });

      this.logger.log(
        `Found ${projects.length} active projects for snapshot generation`,
      );

      let successCount = 0;
      let errorCount = 0;

      // Generate snapshots for each project
      for (const project of projects) {
        try {
          await this.generateSnapshotForProject(project.id, new Date());
          successCount++;
        } catch (error) {
          this.logger.error(
            `Failed to generate snapshot for project ${project.id}:`,
            error.stack,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Daily snapshot generation completed. Success: ${successCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(
        'Critical error during daily snapshots generation',
        error.stack,
      );
    }
  }

  /**
   * Generate historical snapshots for testing purposes
   * This method creates snapshots for the past N days to simulate historical data
   */
  async generateHistoricalSnapshots(projectId: string, days: number = 7) {
    this.logger.log(
      `Generating historical snapshots for project ${projectId} for the past ${days} days`,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      try {
        await this.generateSnapshotForProject(projectId, date);
        this.logger.debug(
          `Generated snapshot for ${date.toISOString().split('T')[0]}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to generate snapshot for ${date.toISOString().split('T')[0]}:`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Historical snapshots generation completed for project ${projectId}`,
    );
  }

  private async generateSnapshotForProject(projectId: string, date: Date) {
    this.logger.debug(
      `Generating snapshot for project ${projectId} on ${date.toISOString().split('T')[0]}`,
    );

    try {
      // Calculate all metrics for the project using services
      const metrics = await this.calculateProjectMetrics(projectId, date);

      this.logger.debug(
        `Calculated metrics for project ${projectId}: totalTasks=${metrics.totalTasks}, completedTasks=${metrics.completedTasks}, completionPercentage=${metrics.completionPercentage}, newTasksToday=${metrics.newTasksToday}, commentsAddedToday=${metrics.commentsAddedToday}`,
      );

      // Check if snapshot already exists for this project and date
      const existingSnapshot = await this.snapshotRepository.findOne({
        where: { projectId, snapshotDate: date },
      });

      if (existingSnapshot) {
        // Update existing snapshot
        await this.snapshotRepository.update(existingSnapshot.id, {
          ...metrics,
        });
        this.logger.debug(
          `Updated existing snapshot for project ${projectId} with ID: ${existingSnapshot.id}`,
        );
      } else {
        // Create new snapshot
        const snapshot = await this.snapshotRepository.save({
          projectId,
          snapshotDate: date,
          ...metrics,
        });
        this.logger.debug(
          `Created new snapshot for project ${projectId} with ID: ${snapshot.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error generating snapshot for project ${projectId}:`,
        error.stack,
      );
      throw error;
    }
  }

  private async calculateProjectMetrics(
    projectId: string,
    date: Date,
  ): Promise<ProjectSnapshotData> {
    this.logger.debug(
      `Calculating metrics for project ${projectId} on ${date.toISOString().split('T')[0]}`,
    );

    // Use services to get data instead of direct repository access
    const tasks = await this.tasksService.findAll(projectId);
    this.logger.debug(`Found ${tasks.length} tasks for project ${projectId}`);

    const todayStart = new Date(date);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);

    // Calculate all metrics in a single pass through the tasks array
    const metrics = tasks.reduce<ProjectMetrics>(
      (acc, task) => {
        // Count by status
        switch (task.status) {
          case TaskStatus.DONE:
            acc.completedTasks++;
            break;
          case TaskStatus.IN_PROGRESS:
            acc.inProgressTasks++;
            break;
          case TaskStatus.TODO:
            acc.todoTasks++;
            break;
        }

        // Count today's activity
        if (task.createdAt >= todayStart && task.createdAt <= todayEnd) {
          acc.newTasksToday++;
        }

        if (
          task.status === TaskStatus.DONE &&
          task.updatedAt >= todayStart &&
          task.updatedAt <= todayEnd
        ) {
          acc.completedTasksToday++;
        }

        return acc;
      },
      {
        totalTasks: tasks.length,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        newTasksToday: 0,
        completedTasksToday: 0,
      },
    );

    this.logger.debug(
      `Task metrics calculated for project ${projectId}: totalTasks=${metrics.totalTasks}, completedTasks=${metrics.completedTasks}, inProgressTasks=${metrics.inProgressTasks}, todoTasks=${metrics.todoTasks}, newTasksToday=${metrics.newTasksToday}, completedTasksToday=${metrics.completedTasksToday}`,
    );

    // Calculate completion percentage
    const completionPercentage =
      metrics.totalTasks > 0
        ? (metrics.completedTasks / metrics.totalTasks) * 100
        : 0;

    this.logger.debug(
      `Completion percentage for project ${projectId}: ${completionPercentage.toFixed(2)}%`,
    );

    // Get today's comments and attachments
    const commentsAddedToday = await this.getCommentsCountForDate(
      projectId,
      todayStart,
      todayEnd,
    );
    const attachmentsUploadedToday = await this.getAttachmentsCountForDate(
      projectId,
      todayStart,
      todayEnd,
    );

    this.logger.debug(
      `Activity metrics for project ${projectId}: commentsAddedToday=${commentsAddedToday}, attachmentsUploadedToday=${attachmentsUploadedToday}`,
    );

    return {
      ...metrics,
      commentsAddedToday,
      attachmentsUploadedToday,
      completionPercentage,
    };
  }

  private async getCommentsCountForDate(
    projectId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    try {
      const count =
        await this.commentsService.getCommentsCountForProjectAndDateRange(
          projectId,
          start,
          end,
        );
      this.logger.debug(
        `Retrieved comments count for project ${projectId}: ${count}`,
      );
      return count;
    } catch (error) {
      this.logger.error(
        `Failed to get comments count for project ${projectId}:`,
        error.stack,
      );
      return 0;
    }
  }

  private async getAttachmentsCountForDate(
    projectId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    try {
      const count =
        await this.attachmentsService.getAttachmentsCountForProjectAndDateRange(
          projectId,
          start,
          end,
        );
      this.logger.debug(
        `Retrieved attachments count for project ${projectId}: ${count}`,
      );
      return count;
    } catch (error) {
      this.logger.error(
        `Failed to get attachments count for project ${projectId}:`,
        error.stack,
      );
      return 0;
    }
  }

  async getProjectProgress(
    projectId: string,
    includeTrends: boolean = false,
    includeActivity: boolean = false,
    days: number = DEFAULT_PROGRESS_DAYS,
  ): Promise<ProjectProgressDto> {
    this.logger.debug(
      `Getting project progress for project ${projectId} with trends: ${includeTrends}, activity: ${includeActivity}, days: ${days}`,
    );

    try {
      // Get current real-time metrics
      const currentDate = DateUtils.setToStartOfDay(new Date());
      const currentMetrics = await this.calculateProjectMetrics(
        projectId,
        currentDate,
      );

      const result: ProjectProgressDto = {
        current: {
          totalTasks: currentMetrics.totalTasks,
          completedTasks: currentMetrics.completedTasks,
          inProgressTasks: currentMetrics.inProgressTasks,
          todoTasks: currentMetrics.todoTasks,
          completionPercentage: currentMetrics.completionPercentage,
        },
      };

      // Add historical trends if requested
      if (includeTrends) {
        const trends = await this.getHistoricalTrends(projectId, days);
        result.trends = trends;
      }

      // Add recent activity if requested
      if (includeActivity) {
        const activity = await this.getRecentActivity(projectId, days);
        result.recentActivity = activity;
      }

      this.logger.debug(
        `Successfully retrieved project progress for project ${projectId}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error getting project progress for project ${projectId}:`,
        error.stack,
      );
      throw error;
    }
  }

  async getHistoricalTrends(
    projectId: string,
    days: number,
  ): Promise<ProjectProgressDto['trends']> {
    const { startDate, endDate } = DateUtils.getDateRangeForLastDays(days);

    const snapshots = await this.snapshotRepository
      .createQueryBuilder('snapshot')
      .where('snapshot.projectId = :projectId', { projectId })
      .andWhere('snapshot.snapshotDate >= :startDate', { startDate })
      .andWhere('snapshot.snapshotDate <= :endDate', { endDate })
      .orderBy('snapshot.snapshotDate', 'ASC')
      .getMany();

    // Group by week for weekly trends
    const weeklyTrends = this.groupSnapshotsByWeek(snapshots);

    return {
      daily: snapshots.map((snapshot) => ({
        date: DateUtils.formatToDateString(snapshot.snapshotDate),
        totalTasks: snapshot.totalTasks,
        completedTasks: snapshot.completedTasks,
        newTasks: snapshot.newTasksToday,
        completionRate: snapshot.completionPercentage,
        commentsAdded: snapshot.commentsAddedToday,
      })),
      weekly: weeklyTrends,
    };
  }

  async getRecentActivity(
    projectId: string,
    days: number,
  ): Promise<ProjectProgressDto['recentActivity']> {
    const { startDate, endDate } = DateUtils.getDateRangeForLastDays(days);

    // Get recent snapshots and sum up activity
    const snapshots = await this.snapshotRepository
      .createQueryBuilder('snapshot')
      .select([
        'SUM(snapshot.newTasksToday) as tasksCreated',
        'SUM(snapshot.completedTasksToday) as tasksCompleted',
        'SUM(snapshot.commentsAddedToday) as commentsAdded',
        'SUM(snapshot.attachmentsUploadedToday) as attachmentsUploaded',
      ])
      .where('snapshot.projectId = :projectId', { projectId })
      .andWhere('snapshot.snapshotDate >= :startDate', { startDate })
      .andWhere('snapshot.snapshotDate <= :endDate', { endDate })
      .getRawOne();

    return {
      tasksCreated: parseInt(
        snapshots?.tasksCreated || DEFAULT_COUNT.toString(),
        DECIMAL_RADIX,
      ),
      tasksCompleted: parseInt(
        snapshots?.tasksCompleted || DEFAULT_COUNT.toString(),
        DECIMAL_RADIX,
      ),
      commentsAdded: parseInt(
        snapshots?.commentsAdded || DEFAULT_COUNT.toString(),
        DECIMAL_RADIX,
      ),
      attachmentsUploaded: parseInt(
        snapshots?.attachmentsUploaded || DEFAULT_COUNT.toString(),
        DECIMAL_RADIX,
      ),
    };
  }

  groupSnapshotsByWeek(
    snapshots: ProjectSnapshot[],
  ): ProjectProgressDto['trends']['weekly'] {
    const weeklyMap = new Map<string, any>();

    snapshots.forEach((snapshot) => {
      const weekStart = DateUtils.getWeekStart(snapshot.snapshotDate);
      const weekKey = DateUtils.formatToDateString(weekStart);

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          week: DateUtils.getWeekNumber(weekStart),
          totalTasks: 0,
          completedTasks: 0,
          newTasks: 0,
          completionRate: 0,
          count: 0,
        });
      }

      const weekData = weeklyMap.get(weekKey);
      weekData.totalTasks += snapshot.totalTasks;
      weekData.completedTasks += snapshot.completedTasks;
      weekData.newTasks += snapshot.newTasksToday;
      weekData.count += 1;
    });

    // Calculate averages
    return Array.from(weeklyMap.values()).map((weekData) => ({
      week: weekData.week,
      totalTasks: Math.round(weekData.totalTasks / weekData.count),
      completedTasks: Math.round(weekData.completedTasks / weekData.count),
      newTasks: weekData.newTasks,
      completionRate:
        Math.round(
          (weekData.completedTasks / weekData.totalTasks) *
            PERCENTAGE_MULTIPLIER,
        ) || 0,
    }));
  }
}
