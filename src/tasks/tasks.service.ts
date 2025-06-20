import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CustomLogger } from '../common/services/logger.service';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly i18n: I18nService,
    private readonly logger: CustomLogger,
    private readonly projectsService: ProjectsService,
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

    // Validate assignee if being updated
    if (updateTaskDto.assigneeId) {
      await this.validateAssignee(
        updateTaskDto.assigneeId,
        projectId,
        acceptLanguage,
      );
    }

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
      const isContributor = contributors.some(
        (contributor) => contributor.userId === assigneeId,
      );

      if (!isContributor) {
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
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // If ProjectsService throws an error (e.g., project not found), re-throw it
      throw error;
    }
  }
}
