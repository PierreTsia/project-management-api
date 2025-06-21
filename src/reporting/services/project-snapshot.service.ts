import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProjectSnapshot } from '../entities/project-snapshot.entity';
import { ProjectsService } from '../../projects/projects.service';
import { TasksService } from '../../tasks/tasks.service';
import { CommentsService } from '../../tasks/services/comments.service';
import { AttachmentsService } from '../../attachments/attachments.service';
import { CustomLogger } from '../../common/services/logger.service';
import { TaskStatus } from '../../tasks/enums/task-status.enum';
import { Prettify } from '../../common/utils/types';

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
    private projectsService: ProjectsService,
    private tasksService: TasksService,
    private commentsService: CommentsService,
    private attachmentsService: AttachmentsService,
    private logger: CustomLogger,
  ) {
    this.logger.setContext('ProjectSnapshotService');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailySnapshots() {
    this.logger.log('Starting daily project snapshots generation...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.logger.log(
      `Generating snapshots for date: ${today.toISOString().split('T')[0]}`,
    );

    try {
      // Get all active projects directly from repository for cron job
      const projects = await this.snapshotRepository.manager
        .getRepository('Project')
        .find({ where: { status: 'ACTIVE' } });

      this.logger.log(
        `Found ${projects.length} active projects for snapshot generation`,
      );

      let successCount = 0;
      let errorCount = 0;

      for (const project of projects) {
        try {
          await this.generateSnapshotForProject(project.id, today);
          successCount++;
          this.logger.debug(
            `Successfully generated snapshot for project: ${project.id}`,
          );
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Failed to generate snapshot for project ${project.id}:`,
            error.stack,
          );
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

      // Save or update snapshot
      const snapshot = await this.snapshotRepository.save({
        projectId,
        snapshotDate: date,
        ...metrics,
      });

      this.logger.debug(
        `Saved snapshot for project ${projectId} with ID: ${snapshot.id}`,
      );
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

    // Get today's comments and attachments (would need service methods)
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
    _projectId: string,
    _start: Date,
    _end: Date, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<number> {
    // This would need a method in CommentsService to get comments by project and date range
    // For now, placeholder implementation
    this.logger.debug(
      `Getting comments count for project ${_projectId} between ${_start.toISOString()} and ${_end.toISOString()}`,
    );
    return 0;
  }

  private async getAttachmentsCountForDate(
    _projectId: string,
    _start: Date,
    _end: Date, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<number> {
    // This would need a method in AttachmentsService to get attachments by project and date range
    // For now, placeholder implementation
    this.logger.debug(
      `Getting attachments count for project ${_projectId} between ${_start.toISOString()} and ${_end.toISOString()}`,
    );
    return 0;
  }
}
