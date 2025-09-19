import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../entities/task-link.entity';
import { CreateTaskLinkDto } from '../dto/create-task-link.dto';
import { TaskLinkResponseDto } from '../dto/task-link-response.dto';
import { TaskLinkWithTaskDto } from '../dto/task-link-with-task.dto';
import { TaskResponseDto } from '../dto/task-response.dto';
import { I18nService } from 'nestjs-i18n';
import { TaskRelationshipValidationChain } from './validation/task-relationship-validation-chain';
import { Task } from '../entities/task.entity';
import { CustomLogger } from '../../common/services/logger.service';
import { TASK_LINK_LIMIT } from '../tasks.module';

@Injectable()
export class TaskLinkService {
  constructor(
    @InjectRepository(TaskLink)
    private readonly taskLinkRepository: Repository<TaskLink>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly i18n: I18nService,
    private readonly relationshipValidator: TaskRelationshipValidationChain,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext(TaskLinkService.name);
  }

  async createLink(
    input: CreateTaskLinkDto,
    acceptLanguage?: string,
  ): Promise<TaskLink> {
    this.logger.log(
      `Creating task link: ${input.sourceTaskId} -> ${input.targetTaskId} (${input.type}) in project ${input.projectId}`,
    );

    // Load minimal task projections to validate
    const [sourceTask, targetTask] = await Promise.all([
      this.taskRepository.findOne({ where: { id: input.sourceTaskId } }),
      this.taskRepository.findOne({ where: { id: input.targetTaskId } }),
    ]);

    if (!sourceTask) {
      this.logger.warn(
        `Task link creation failed: source task not found: ${input.sourceTaskId} in project ${input.projectId}`,
      );
      throw new NotFoundException(
        this.i18n.t('errors.tasks.task_not_found', {
          args: { id: input.sourceTaskId, projectId: input.projectId },
          lang: acceptLanguage,
        }),
      );
    }
    if (!targetTask) {
      this.logger.warn(
        `Task link creation failed: target task not found: ${input.targetTaskId} in project ${input.projectId}`,
      );
      throw new NotFoundException(
        this.i18n.t('errors.tasks.task_not_found', {
          args: { id: input.targetTaskId, projectId: input.projectId },
          lang: acceptLanguage,
        }),
      );
    }

    // Basic link count check for limit (could be optimized with count query)
    const existing = await this.taskLinkRepository.count({
      where: [
        { sourceTaskId: input.sourceTaskId },
        { targetTaskId: input.sourceTaskId },
        { sourceTaskId: input.targetTaskId },
        { targetTaskId: input.targetTaskId },
      ],
    });
    if (existing >= TASK_LINK_LIMIT * 2) {
      // TASK_LINK_LIMIT per task on both sides conservatively
      this.logger.warn(
        `Task link creation failed: link limit reached for task ${input.sourceTaskId} (${existing} existing links)`,
      );
      throw new BadRequestException(
        this.i18n.t('errors.task_links.link_limit_reached', {
          args: { limit: TASK_LINK_LIMIT },
          lang: acceptLanguage,
        }),
      );
    }

    const validation = await this.relationshipValidator.canCreateLink({
      sourceTask: sourceTask as Task,
      targetTask: targetTask as Task,
      linkType: input.type,
      projectId: input.projectId,
    });
    if (validation.valid === false) {
      this.logger.warn(
        `Task link creation failed: validation error - ${validation.reason} for ${input.sourceTaskId} -> ${input.targetTaskId} (${input.type})`,
      );
      throw new BadRequestException(
        this.i18n.t(validation.reason || 'errors.task_links.invalid', {
          lang: acceptLanguage,
        }),
      );
    }

    const entity = this.taskLinkRepository.create({
      projectId: input.projectId,
      sourceTaskId: input.sourceTaskId,
      targetTaskId: input.targetTaskId,
      type: input.type,
    });
    const savedLink = await this.taskLinkRepository.save(entity);

    this.logger.log(
      `Task link created successfully: ${savedLink.id} (${savedLink.type})`,
    );

    return savedLink;
  }

  async listLinksByTask(taskId: string): Promise<TaskLinkResponseDto> {
    const links = await this.taskLinkRepository.find({
      where: [{ sourceTaskId: taskId }, { targetTaskId: taskId }],
      order: { createdAt: 'DESC' },
    });
    return { links, total: links.length };
  }

  async deleteLink(
    projectId: string,
    taskId: string,
    linkId: string,
    acceptLanguage?: string,
  ): Promise<void> {
    this.logger.log(
      `Deleting task link: ${linkId} for task ${taskId} in project ${projectId}`,
    );

    const link = await this.taskLinkRepository.findOne({
      where: [
        { id: linkId, projectId, sourceTaskId: taskId },
        { id: linkId, projectId, targetTaskId: taskId },
      ],
    });
    if (!link) {
      throw new NotFoundException(
        this.i18n.t('errors.task_links.not_found', {
          lang: acceptLanguage,
          args: { linkId, taskId, projectId },
        }),
      );
    }
    await this.taskLinkRepository.delete({ id: linkId });

    this.logger.log(`Task link deleted successfully: ${linkId} (${link.type})`);
  }

  // Repository lookups used in createLink; no raw SQL helper needed.

  async listRelatedTaskIds(taskId: string): Promise<string[]> {
    const links = await this.taskLinkRepository.find({
      where: [{ sourceTaskId: taskId }, { targetTaskId: taskId }],
    });
    const related = links.map((l) =>
      l.sourceTaskId === taskId ? l.targetTaskId : l.sourceTaskId,
    );
    const unique = Array.from(new Set(related));
    return unique;
  }

  async listLinksWithTasks(taskId: string): Promise<TaskLinkWithTaskDto[]> {
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
}
