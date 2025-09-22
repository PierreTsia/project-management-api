import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { SearchTasksDto } from './dto/search-tasks.dto';
import { GlobalSearchTasksDto } from './dto/global-search-tasks.dto';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { BulkAssignTasksDto } from './dto/bulk-assign-tasks.dto';
import { BulkDeleteTasksDto } from './dto/bulk-delete-tasks.dto';
import {
  BulkOperationResponseDto,
  BulkOperationResult,
} from './dto/bulk-operation-response.dto';
import { TaskStatus } from './enums/task-status.enum';
import { ProjectStatus } from '../projects/entities/project.entity';

import { CustomLogger } from '../common/services/logger.service';
import { ProjectsService } from '../projects/projects.service';
import { TaskStatusService } from './services/task-status.service';
import { TaskLink } from './entities/task-link.entity';
import { TaskLinkDto } from './dto/task-link.dto';
import { TaskLinkWithTaskDto } from './dto/task-link-with-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { TaskRelationshipHydrator } from './services/task-relationship-hydrator.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskLink)
    private readonly taskLinkRepository: Repository<TaskLink>,
    private readonly i18n: I18nService,
    private readonly logger: CustomLogger,
    private readonly projectsService: ProjectsService,
    private readonly taskStatusService: TaskStatusService,
    private readonly taskRelationshipHydrator: TaskRelationshipHydrator,
  ) {
    this.logger.setContext(TasksService.name);
  }

  async getTaskLinks(taskId: string): Promise<TaskLinkWithTaskDto[]> {
    const links = await this.taskLinkRepository.find({
      where: [{ sourceTaskId: taskId }, { targetTaskId: taskId }],
      relations: [
        'sourceTask',
        'targetTask',
        'sourceTask.assignee',
        'sourceTask.project',
        'targetTask.assignee',
        'targetTask.project',
      ],
    });

    return links.map((link) => {
      return new TaskLinkWithTaskDto({
        id: link.id,
        projectId: link.projectId,
        sourceTaskId: link.sourceTaskId,
        targetTaskId: link.targetTaskId,
        type: link.type,
        createdAt: link.createdAt,
        ...(link.sourceTask && {
          sourceTask: new TaskResponseDto(link.sourceTask),
        }),
        ...(link.targetTask && {
          targetTask: new TaskResponseDto(link.targetTask),
        }),
      });
    });
  }

  async getLinksMap(taskIds: string[]): Promise<Map<string, TaskLinkDto[]>> {
    if (!taskIds.length) return new Map();
    const links = await this.taskLinkRepository.find({
      where: taskIds.flatMap((id) => [
        { sourceTaskId: id },
        { targetTaskId: id },
      ]),
    });
    const map = new Map<string, TaskLinkDto[]>();
    for (const id of taskIds) map.set(id, []);
    for (const l of links) {
      const dto: TaskLinkDto = {
        id: l.id,
        projectId: l.projectId,
        sourceTaskId: l.sourceTaskId,
        targetTaskId: l.targetTaskId,
        type: l.type,
        createdAt: l.createdAt,
      };
      map.get(l.sourceTaskId)?.push(dto);
      map.get(l.targetTaskId)?.push(dto);
    }
    return map;
  }

  async getTaskWithRelationships(taskId: string): Promise<{
    links: TaskLinkWithTaskDto[];
    hierarchy: any;
  }> {
    return this.taskRelationshipHydrator.hydrateTaskRelationships(taskId);
  }

  async create(createTaskDto: CreateTaskDto, projectId: string): Promise<Task> {
    this.logger.debug(
      `Creating task "${createTaskDto.title}" for project ${projectId}`,
    );

    // Validate assignee if provided
    if (createTaskDto.assigneeId) {
      await this.validateAssignee(createTaskDto.assigneeId, projectId);
    }

    const task = this.taskRepository.create({
      ...createTaskDto,
      projectId,
    });
    const savedTask = await this.taskRepository.save(task);

    // Reload the task with assignee relation if assigneeId is provided
    if (createTaskDto.assigneeId) {
      const createdTask = await this.taskRepository.findOne({
        where: { id: savedTask.id },
        relations: ['assignee', 'project'],
      });
      this.logger.log(`Task created successfully with id: ${savedTask.id}`);

      return createdTask;
    }

    this.logger.log(`Task created successfully with id: ${savedTask.id}`);
    return savedTask;
  }

  async findAll(projectId: string): Promise<Task[]> {
    this.logger.debug(`Finding all tasks for project ${projectId}`);
    const tasks = await this.taskRepository.find({
      where: { projectId },
      relations: ['assignee', 'project'],
    });

    return tasks;
  }

  async findOne(
    id: string,
    projectId: string,
    acceptLanguage?: string,
  ): Promise<Task> {
    this.logger.debug(`Finding task with id: ${id} for project ${projectId}`);
    const task = await this.taskRepository.findOne({
      where: { id, projectId },
      relations: ['assignee', 'project'],
    });
    if (!task) {
      this.logger.warn(
        `Task not found with id: ${id} for project ${projectId}`,
      );
      throw new NotFoundException(
        this.i18n.t('errors.tasks.task_not_found', {
          lang: acceptLanguage,
          args: { id, projectId },
        }),
      );
    }

    return task;
  }

  async findById(id: string, acceptLanguage?: string): Promise<Task> {
    this.logger.debug(`Finding task with id: ${id}`);
    const task = await this.taskRepository.findOne({
      where: { id },
    });
    if (!task) {
      this.logger.warn(`Task not found with id: ${id}`);
      throw new NotFoundException(
        this.i18n.t('errors.tasks.task_not_found', {
          lang: acceptLanguage,
          args: { id, projectId: 'unknown' },
        }),
      );
    }

    return task;
  }

  async update(
    id: string,
    projectId: string,
    updateTaskDto: UpdateTaskDto,
    acceptLanguage?: string,
  ): Promise<Task> {
    this.logger.debug(
      `Updating task ${id} from project ${projectId} with data: ${JSON.stringify(
        updateTaskDto,
      )}`,
    );

    const task = await this.findOne(id, projectId, acceptLanguage);
    const updatedTask = this.taskRepository.merge(task, updateTaskDto);
    const savedTask = await this.taskRepository.save(updatedTask);

    this.logger.log(`Task ${id} updated successfully`);
    return savedTask;
  }

  async remove(
    id: string,
    projectId: string,
    acceptLanguage?: string,
  ): Promise<void> {
    this.logger.debug(`Deleting task ${id} from project ${projectId}`);
    const result = await this.taskRepository.delete({ id, projectId });
    if (result.affected === 0) {
      this.logger.warn(
        `Task not found for deletion with id: ${id} for project ${projectId}`,
      );
      throw new NotFoundException(
        this.i18n.t('errors.tasks.task_not_found', {
          lang: acceptLanguage,
          args: { id, projectId },
        }),
      );
    }
    this.logger.log(`Task ${id} deleted successfully`);
  }

  async updateStatus(
    id: string,
    projectId: string,
    updateTaskStatusDto: UpdateTaskStatusDto,
    userId: string,
    acceptLanguage?: string,
  ): Promise<Task> {
    this.logger.debug(
      `Updating status for task ${id} from project ${projectId} to ${updateTaskStatusDto.status} by user ${userId}`,
    );

    const task = await this.findOne(id, projectId, acceptLanguage);

    // Check if user is the assignee
    if (task.assigneeId !== userId) {
      this.logger.warn(
        `User ${userId} attempted to update status for task ${id} but is not the assignee (assignee: ${task.assigneeId})`,
      );
      throw new ForbiddenException(
        this.i18n.t('errors.tasks.only_assignee_can_update_status', {
          lang: acceptLanguage,
          args: { taskId: id },
        }),
      );
    }

    // Validate status transition
    this.taskStatusService.validateAndThrowIfInvalid(
      task.status,
      updateTaskStatusDto.status,
    );

    // Store original status for logging
    const originalStatus = task.status;

    // Update the status
    task.status = updateTaskStatusDto.status;
    const savedTask = await this.taskRepository.save(task);

    this.logger.log(
      `Task ${id} status updated successfully from ${originalStatus} to ${updateTaskStatusDto.status}`,
    );
    return savedTask;
  }

  async assignTask(
    id: string,
    projectId: string,
    assigneeId: string,
    acceptLanguage?: string,
  ): Promise<Task> {
    this.logger.debug(
      `Assigning task ${id} from project ${projectId} to user ${assigneeId}`,
    );

    const task = await this.findOne(id, projectId, acceptLanguage);

    // Validate the new assignee
    await this.validateAssignee(assigneeId, projectId, acceptLanguage);

    // Update the assignee
    task.assigneeId = assigneeId;
    // Clear the existing assignee relation to force TypeORM to reload it
    task.assignee = undefined;
    const savedTask = await this.taskRepository.save(task);

    // Reload the task with assignee relation
    const updatedTask = await this.taskRepository.findOne({
      where: { id: savedTask.id },
      relations: ['assignee', 'project'],
    });

    this.logger.log(`Task ${id} assigned successfully to user ${assigneeId}`);
    return updatedTask;
  }

  async unassignTask(
    id: string,
    projectId: string,
    acceptLanguage?: string,
  ): Promise<Task> {
    this.logger.debug(`Unassigning task ${id} from project ${projectId}`);

    const task = await this.findOne(id, projectId, acceptLanguage);

    // Update the assignee to null
    task.assigneeId = null;
    // Clear the existing assignee relation
    task.assignee = undefined;
    const savedTask = await this.taskRepository.save(task);

    // Reload the task with assignee relation
    const updatedTask = await this.taskRepository.findOne({
      where: { id: savedTask.id },
      relations: ['assignee', 'project'],
    });

    this.logger.log(`Task ${id} unassigned successfully`);
    return updatedTask;
  }

  private async validateAssignee(
    assigneeId: string,
    projectId: string,
    acceptLanguage?: string,
  ): Promise<void> {
    try {
      // Use ProjectsService to check if user is a contributor
      const contributors = await this.projectsService.getContributors(
        projectId,
        acceptLanguage,
      );
      const contributor = contributors.find(
        (contributor) => contributor.userId === assigneeId,
      );

      if (!contributor) {
        this.logger.warn(
          `User ${assigneeId} is not a contributor to project ${projectId}`,
        );
        throw new BadRequestException(
          this.i18n.t('errors.tasks.assignee_not_contributor', {
            lang: acceptLanguage,
            args: { assigneeId, projectId },
          }),
        );
      }

      // Check if user has WRITE role or higher (WRITE, ADMIN, OWNER)
      const hasWriteRole = ['WRITE', 'ADMIN', 'OWNER'].includes(
        contributor.role,
      );
      if (!hasWriteRole) {
        this.logger.warn(
          `User ${assigneeId} has insufficient role (${contributor.role}) to be assigned tasks in project ${projectId}`,
        );
        throw new BadRequestException(
          this.i18n.t('errors.tasks.assignee_insufficient_role', {
            lang: acceptLanguage,
            args: { assigneeId, projectId, role: contributor.role },
          }),
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // If ProjectsService throws an error (e.g., project not found), re-throw it
      throw error;
    }
  }

  async searchTasks(
    projectId: string,
    searchDto: SearchTasksDto,
  ): Promise<{ tasks: Task[]; total: number; page: number; limit: number }> {
    this.logger.debug(
      `Searching tasks for project ${projectId} with filters: ${JSON.stringify(
        searchDto,
      )}`,
    );

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.project', 'project')
      .where('task.projectId = :projectId', { projectId });

    // Text search (case-insensitive)
    if (searchDto.query) {
      queryBuilder.andWhere(
        '(task.title ILIKE :query OR task.description ILIKE :query)',
        { query: `%${searchDto.query}%` },
      );
    }

    // Status filter
    if (searchDto.status) {
      queryBuilder.andWhere('task.status = :status', {
        status: searchDto.status,
      });
    }

    // Priority filter
    if (searchDto.priority) {
      queryBuilder.andWhere('task.priority = :priority', {
        priority: searchDto.priority,
      });
    }

    // Assignee filter
    if (searchDto.assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', {
        assigneeId: searchDto.assigneeId,
      });
    }

    // Pagination
    const skip = (searchDto.page - 1) * searchDto.limit;
    queryBuilder.skip(skip).take(searchDto.limit);

    // Order by creation date (newest first)
    queryBuilder.orderBy('task.createdAt', 'DESC');

    const [tasks, total] = await queryBuilder.getManyAndCount();

    this.logger.log(
      `Found ${tasks.length} tasks out of ${total} total for project ${projectId}`,
    );

    return { tasks, total, page: searchDto.page, limit: searchDto.limit };
  }

  /**
   * Find all tasks across all projects accessible by the user
   */
  async findAllUserTasks(
    userId: string,
    searchDto: GlobalSearchTasksDto,
  ): Promise<{ tasks: Task[]; total: number; page: number; limit: number }> {
    this.logger.debug(
      `Finding all user tasks for user ${userId} with filters: ${JSON.stringify(
        searchDto,
      )}`,
    );

    // Get user's accessible projects
    const projects = await this.projectsService.findAll(userId);
    const projectIds = projects.map((p) => p.id);

    if (projectIds.length === 0) {
      this.logger.debug(`User ${userId} has no accessible projects`);
      return {
        tasks: [],
        total: 0,
        page: searchDto.page || 1,
        limit: searchDto.limit || 20,
      };
    }

    return this.searchAllUserTasks(userId, searchDto, projectIds);
  }

  /**
   * Search tasks across all projects accessible by the user
   */
  async searchAllUserTasks(
    userId: string,
    searchDto: GlobalSearchTasksDto,
    projectIds?: string[],
  ): Promise<{ tasks: Task[]; total: number; page: number; limit: number }> {
    this.logger.debug(
      `Searching all user tasks for user ${userId} with filters: ${JSON.stringify(
        searchDto,
      )}`,
    );

    // Get user's accessible projects if not provided
    if (!projectIds) {
      const projects = await this.projectsService.findAll(userId);
      const accessibleProjectIds = projects.map((p) => p.id);

      // Validate requested projectIds if present on DTO
      const requestedIds = searchDto.projectIds;
      if (requestedIds && requestedIds.length > 0) {
        const invalid = requestedIds.filter(
          (id) => !accessibleProjectIds.includes(id),
        );
        if (invalid.length > 0) {
          throw new ForbiddenException(
            `Insufficient permissions for projectIds: ${invalid.join(', ')}`,
          );
        }
        projectIds = requestedIds;
      } else {
        projectIds = accessibleProjectIds;
      }
    }

    if (projectIds.length === 0) {
      this.logger.debug(`User ${userId} has no accessible projects`);
      return {
        tasks: [],
        total: 0,
        page: searchDto.page || 1,
        limit: searchDto.limit || 20,
      };
    }

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.project', 'project')
      .where('task.projectId IN (:...projectIds)', { projectIds });

    // By default, restrict to ACTIVE projects unless includeArchived is true
    if (searchDto.includeArchived !== true) {
      queryBuilder.andWhere('project.status = :activeStatus', {
        activeStatus: ProjectStatus.ACTIVE,
      });
    }

    // Apply filters
    this.applyGlobalSearchFilters(queryBuilder, searchDto, userId);

    // Apply pagination
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 20;
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Apply sorting
    this.applySorting(queryBuilder, searchDto);

    const [tasks, total] = await queryBuilder.getManyAndCount();

    this.logger.log(
      `Found ${tasks.length} tasks out of ${total} total for user ${userId}`,
    );

    return {
      tasks,
      total,
      page,
      limit,
    };
  }

  /**
   * Apply search filters to the query builder
   */
  private applyGlobalSearchFilters(
    queryBuilder: SelectQueryBuilder<Task>,
    searchDto: GlobalSearchTasksDto,
    userId: string,
  ): void {
    // Text search (case-insensitive)
    if (searchDto.query) {
      queryBuilder.andWhere(
        '(task.title ILIKE :query OR task.description ILIKE :query)',
        { query: `%${searchDto.query}%` },
      );
    }

    // Status filter
    if (searchDto.status) {
      queryBuilder.andWhere('task.status = :status', {
        status: searchDto.status,
      });
    }

    // Priority filter
    if (searchDto.priority) {
      queryBuilder.andWhere('task.priority = :priority', {
        priority: searchDto.priority,
      });
    }

    // Assignee filter
    if (searchDto.assigneeId) {
      queryBuilder.andWhere('task.assigneeId = :assigneeId', {
        assigneeId: searchDto.assigneeId,
      });
    }

    // Project filter (removed single projectId; handled via projectIds at top-level where clause)

    // Due date range filter
    if (searchDto.dueDateFrom) {
      queryBuilder.andWhere('task.dueDate >= :dueDateFrom', {
        dueDateFrom: searchDto.dueDateFrom,
      });
    }

    if (searchDto.dueDateTo) {
      queryBuilder.andWhere('task.dueDate <= :dueDateTo', {
        dueDateTo: searchDto.dueDateTo,
      });
    }

    // Created date range filter
    if (searchDto.createdFrom) {
      queryBuilder.andWhere('task.createdAt >= :createdFrom', {
        createdFrom: searchDto.createdFrom,
      });
    }

    if (searchDto.createdTo) {
      queryBuilder.andWhere('task.createdAt <= :createdTo', {
        createdTo: searchDto.createdTo,
      });
    }

    // Assignee filter (me/unassigned/any)
    if (searchDto.assigneeFilter) {
      switch (searchDto.assigneeFilter) {
        case 'me':
          queryBuilder.andWhere('task.assigneeId = :userId', { userId });
          break;
        case 'unassigned':
          queryBuilder.andWhere('task.assigneeId IS NULL');
          break;
        case 'any':
          // No additional filter needed
          break;
      }
    }

    // Overdue filter
    if (searchDto.isOverdue === true) {
      queryBuilder
        .andWhere('task.dueDate < NOW()')
        .andWhere('task.status != :doneStatus', {
          doneStatus: TaskStatus.DONE,
        });
    }

    // Has due date filter
    if (searchDto.hasDueDate === true) {
      queryBuilder.andWhere('task.dueDate IS NOT NULL');
    } else if (searchDto.hasDueDate === false) {
      queryBuilder.andWhere('task.dueDate IS NULL');
    }
  }

  /**
   * Apply sorting to the query builder
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<Task>,
    searchDto: GlobalSearchTasksDto,
  ): void {
    const sortBy = searchDto.sortBy || 'createdAt';
    const sortOrder = searchDto.sortOrder || 'DESC';

    // Map sort fields to database columns
    const sortFieldMap = {
      createdAt: 'task.createdAt',
      dueDate: 'task.dueDate',
      priority: 'task.priority',
      status: 'task.status',
      title: 'task.title',
    };

    const sortField = sortFieldMap[sortBy] || 'task.createdAt';

    // Handle special sorting for priority and status using simple string sorting
    if (sortBy === 'priority') {
      // For priority, we'll use simple string sorting which works well with enum values
      // HIGH comes before LOW alphabetically, so we need to reverse for DESC
      if (sortOrder === 'DESC') {
        queryBuilder.orderBy('task.priority', 'ASC'); // HIGH -> LOW alphabetically
      } else {
        queryBuilder.orderBy('task.priority', 'DESC'); // LOW -> HIGH
      }
    } else if (sortBy === 'status') {
      // For status, we'll use simple string sorting
      // DONE comes before IN_PROGRESS comes before TODO alphabetically
      if (sortOrder === 'DESC') {
        queryBuilder.orderBy('task.status', 'ASC'); // DONE -> IN_PROGRESS -> TODO
      } else {
        queryBuilder.orderBy('task.status', 'DESC'); // TODO -> IN_PROGRESS -> DONE
      }
    } else {
      queryBuilder.orderBy(sortField, sortOrder);
    }

    // Add secondary sort for consistency
    if (sortBy !== 'createdAt') {
      queryBuilder.addOrderBy('task.createdAt', 'DESC');
    }
  }

  /**
   * Bulk update status for multiple tasks
   */
  async bulkUpdateStatus(
    userId: string,
    bulkUpdateDto: BulkUpdateStatusDto,
  ): Promise<BulkOperationResponseDto> {
    this.logger.debug(
      `Bulk updating status for ${bulkUpdateDto.taskIds.length} tasks to ${bulkUpdateDto.status}`,
    );

    const successfulTaskIds: string[] = [];
    const errors: Array<{ taskId: string; error: string }> = [];

    // Use transaction for atomicity
    return await this.taskRepository.manager.transaction(
      async (transactionalEntityManager) => {
        for (const taskId of bulkUpdateDto.taskIds) {
          try {
            // Find task and verify user has access
            const task = await transactionalEntityManager.findOne(Task, {
              where: { id: taskId },
              relations: ['project', 'project.contributors'],
            });

            if (!task) {
              errors.push({ taskId, error: 'Task not found' });
              continue;
            }

            // Check if user has access to the project
            const hasAccess = task.project.contributors.some(
              (contributor) => contributor.userId === userId,
            );

            if (!hasAccess) {
              errors.push({ taskId, error: 'Insufficient permissions' });
              continue;
            }

            // Check if user is the assignee (only assignees can update status)
            if (task.assigneeId !== userId) {
              errors.push({
                taskId,
                error: 'Only the assignee can update task status',
              });
              continue;
            }

            // Validate status transition
            this.taskStatusService.validateAndThrowIfInvalid(
              task.status,
              bulkUpdateDto.status,
            );

            // Update task status
            await transactionalEntityManager.update(Task, taskId, {
              status: bulkUpdateDto.status,
              updatedAt: new Date(),
            });

            successfulTaskIds.push(taskId);
          } catch (error) {
            this.logger.warn(
              `Failed to update task ${taskId}: ${error.message}`,
            );
            errors.push({ taskId, error: error.message });
          }
        }

        const result: BulkOperationResult = {
          successCount: successfulTaskIds.length,
          failureCount: errors.length,
          totalCount: bulkUpdateDto.taskIds.length,
          successfulTaskIds,
          errors,
          message: `Bulk status update completed: ${successfulTaskIds.length} successful, ${errors.length} failed`,
        };

        return {
          result,
          success: errors.length === 0,
          timestamp: new Date().toISOString(),
        };
      },
    );
  }

  /**
   * Bulk assign tasks to a user
   */
  async bulkAssignTasks(
    userId: string,
    bulkAssignDto: BulkAssignTasksDto,
  ): Promise<BulkOperationResponseDto> {
    this.logger.debug(
      `Bulk assigning ${bulkAssignDto.taskIds.length} tasks to user ${bulkAssignDto.assigneeId}`,
    );

    const successfulTaskIds: string[] = [];
    const errors: Array<{ taskId: string; error: string }> = [];

    // Use transaction for atomicity
    return await this.taskRepository.manager.transaction(
      async (transactionalEntityManager) => {
        for (const taskId of bulkAssignDto.taskIds) {
          try {
            // Find task and verify user has access
            const task = await transactionalEntityManager.findOne(Task, {
              where: { id: taskId },
              relations: ['project', 'project.contributors'],
            });

            if (!task) {
              errors.push({ taskId, error: 'Task not found' });
              continue;
            }

            // Check if user has access to the project and sufficient role
            const userContributor = task.project.contributors.find(
              (contributor) => contributor.userId === userId,
            );

            if (!userContributor) {
              errors.push({ taskId, error: 'Insufficient permissions' });
              continue;
            }

            // Check if user has WRITE role or higher to assign tasks
            const hasWriteRole = ['WRITE', 'ADMIN', 'OWNER'].includes(
              userContributor.role,
            );
            if (!hasWriteRole) {
              errors.push({
                taskId,
                error: 'Insufficient role to assign tasks',
              });
              continue;
            }

            // Check if assignee is a project contributor
            const assigneeIsContributor = task.project.contributors.some(
              (contributor) => contributor.userId === bulkAssignDto.assigneeId,
            );

            if (!assigneeIsContributor) {
              errors.push({
                taskId,
                error: 'Assignee is not a project contributor',
              });
              continue;
            }

            // Update task assignee
            await transactionalEntityManager.update(Task, taskId, {
              assigneeId: bulkAssignDto.assigneeId,
              updatedAt: new Date(),
            });

            successfulTaskIds.push(taskId);
          } catch (error) {
            this.logger.warn(
              `Failed to assign task ${taskId}: ${error.message}`,
            );
            errors.push({ taskId, error: error.message });
          }
        }

        const result: BulkOperationResult = {
          successCount: successfulTaskIds.length,
          failureCount: errors.length,
          totalCount: bulkAssignDto.taskIds.length,
          successfulTaskIds,
          errors,
          message: `Bulk assignment completed: ${successfulTaskIds.length} successful, ${errors.length} failed`,
        };

        return {
          result,
          success: errors.length === 0,
          timestamp: new Date().toISOString(),
        };
      },
    );
  }

  /**
   * Bulk delete tasks
   */
  async bulkDeleteTasks(
    userId: string,
    bulkDeleteDto: BulkDeleteTasksDto,
  ): Promise<BulkOperationResponseDto> {
    this.logger.debug(`Bulk deleting ${bulkDeleteDto.taskIds.length} tasks`);

    const successfulTaskIds: string[] = [];
    const errors: Array<{ taskId: string; error: string }> = [];

    // Use transaction for atomicity
    return await this.taskRepository.manager.transaction(
      async (transactionalEntityManager) => {
        for (const taskId of bulkDeleteDto.taskIds) {
          try {
            // Find task and verify user has access
            const task = await transactionalEntityManager.findOne(Task, {
              where: { id: taskId },
              relations: ['project', 'project.contributors'],
            });

            if (!task) {
              errors.push({ taskId, error: 'Task not found' });
              continue;
            }

            // Check if user has access to the project and sufficient role
            const userContributor = task.project.contributors.find(
              (contributor) => contributor.userId === userId,
            );

            if (!userContributor) {
              errors.push({ taskId, error: 'Insufficient permissions' });
              continue;
            }

            // Check if user has ADMIN or OWNER role to delete tasks
            const hasDeleteRole = ['ADMIN', 'OWNER'].includes(
              userContributor.role,
            );
            if (!hasDeleteRole) {
              errors.push({
                taskId,
                error: 'Insufficient role to delete tasks',
              });
              continue;
            }

            // Delete task
            await transactionalEntityManager.delete(Task, taskId);

            successfulTaskIds.push(taskId);
          } catch (error) {
            this.logger.warn(
              `Failed to delete task ${taskId}: ${error.message}`,
            );
            errors.push({ taskId, error: error.message });
          }
        }

        const result: BulkOperationResult = {
          successCount: successfulTaskIds.length,
          failureCount: errors.length,
          totalCount: bulkDeleteDto.taskIds.length,
          successfulTaskIds,
          errors,
          message: `Bulk deletion completed: ${successfulTaskIds.length} successful, ${errors.length} failed`,
        };

        return {
          result,
          success: errors.length === 0,
          timestamp: new Date().toISOString(),
        };
      },
    );
  }
}
