import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { SearchTasksDto } from './dto/search-tasks.dto';
import { CustomLogger } from '../common/services/logger.service';
import { ProjectsService } from '../projects/projects.service';
import { TaskStatusService } from './services/task-status.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly i18n: I18nService,
    private readonly logger: CustomLogger,
    private readonly projectsService: ProjectsService,
    private readonly taskStatusService: TaskStatusService,
  ) {
    this.logger.setContext(TasksService.name);
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
    this.logger.log(`Task created successfully with id: ${savedTask.id}`);
    return savedTask;
  }

  async findAll(projectId: string): Promise<Task[]> {
    this.logger.debug(`Finding all tasks for project ${projectId}`);
    return this.taskRepository.find({ where: { projectId } });
  }

  async findOne(
    id: string,
    projectId: string,
    acceptLanguage?: string,
  ): Promise<Task> {
    this.logger.debug(`Finding task with id: ${id} for project ${projectId}`);
    const task = await this.taskRepository.findOne({
      where: { id, projectId },
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
    const savedTask = await this.taskRepository.save(task);

    this.logger.log(`Task ${id} assigned successfully to user ${assigneeId}`);
    return savedTask;
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

    return {
      tasks,
      total,
      page: searchDto.page,
      limit: searchDto.limit,
    };
  }
}
