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
import { TaskLinkType } from '../enums/task-link-type.enum';
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

  /**
   * Get the inverse relationship type for bidirectional links
   */
  private getInverseLinkType(type: TaskLinkType): TaskLinkType {
    switch (type) {
      case 'IS_BLOCKED_BY':
        return 'BLOCKS';
      case 'BLOCKS':
        return 'IS_BLOCKED_BY';
      case 'SPLITS_TO':
        return 'SPLITS_FROM';
      case 'SPLITS_FROM':
        return 'SPLITS_TO';
      case 'DUPLICATES':
        return 'IS_DUPLICATED_BY';
      case 'IS_DUPLICATED_BY':
        return 'DUPLICATES';
      case 'RELATES_TO':
        return 'RELATES_TO'; // Symmetric relationship
      default:
        return type;
    }
  }

  async createLink(
    input: CreateTaskLinkDto,
    acceptLanguage?: string,
  ): Promise<TaskLink> {
    this.logger.log(
      `Creating bidirectional task link: ${input.sourceTaskId} -> ${input.targetTaskId} (${input.type}) in project ${input.projectId}`,
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

    // Check if link already exists to prevent duplicates (bidirectional)
    const inverseLinkType = this.getInverseLinkType(input.type);
    const existingLink = await this.taskLinkRepository.findOne({
      where: [
        {
          projectId: input.projectId,
          sourceTaskId: input.sourceTaskId,
          targetTaskId: input.targetTaskId,
          type: input.type,
        },
        {
          projectId: input.projectId,
          sourceTaskId: input.sourceTaskId,
          targetTaskId: input.targetTaskId,
          type: inverseLinkType,
        },
        {
          projectId: input.projectId,
          sourceTaskId: input.targetTaskId,
          targetTaskId: input.sourceTaskId,
          type: inverseLinkType,
        },
      ],
    });
    if (existingLink) {
      this.logger.warn(
        `Task link already exists: ${input.sourceTaskId} <-> ${input.targetTaskId} (${input.type})`,
      );
      throw new BadRequestException(
        this.i18n.t('errors.task_links.already_exists', {
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

    // Create the original link
    const originalEntity = this.taskLinkRepository.create({
      projectId: input.projectId,
      sourceTaskId: input.sourceTaskId,
      targetTaskId: input.targetTaskId,
      type: input.type,
    });
    const savedOriginalLink =
      await this.taskLinkRepository.save(originalEntity);

    // Create the inverse link
    const inverseType = this.getInverseLinkType(input.type);
    const inverseEntity = this.taskLinkRepository.create({
      projectId: input.projectId,
      sourceTaskId: input.targetTaskId,
      targetTaskId: input.sourceTaskId,
      type: inverseType,
    });
    await this.taskLinkRepository.save(inverseEntity);

    this.logger.log(
      `Bidirectional task links created successfully: ${savedOriginalLink.id} (${savedOriginalLink.type}) and inverse (${inverseType})`,
    );

    return savedOriginalLink;
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
      `Deleting bidirectional task link: ${linkId} for task ${taskId} in project ${projectId}`,
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

    // Find and delete both the original link and its inverse
    const inverseType = this.getInverseLinkType(link.type);
    const inverseLink = await this.taskLinkRepository.findOne({
      where: {
        projectId,
        sourceTaskId: link.targetTaskId,
        targetTaskId: link.sourceTaskId,
        type: inverseType,
      },
    });

    // Delete both links
    await this.taskLinkRepository.delete({ id: linkId });
    if (inverseLink) {
      await this.taskLinkRepository.delete({ id: inverseLink.id });
    } else {
      this.logger.warn(
        `Inverse task link not found for deletion: linkId=${linkId}, projectId=${projectId}, sourceTaskId=${link.targetTaskId}, targetTaskId=${link.sourceTaskId}, type=${inverseType}. This may indicate a data consistency issue.`,
      );
    }

    this.logger.log(
      `Bidirectional task links deleted successfully: ${linkId} (${link.type}) and inverse (${inverseType})`,
    );
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

  /**
   * Batch fetch links for multiple tasks to avoid N+1 queries
   * @param taskIds - Array of task IDs to fetch links for
   * @returns Map of taskId -> TaskLinkWithTaskDto[] for efficient lookup
   */
  async batchListLinksWithTasks(
    taskIds: string[],
  ): Promise<Map<string, TaskLinkWithTaskDto[]>> {
    if (taskIds.length === 0) {
      return new Map();
    }

    const links = await this.taskLinkRepository.find({
      where: taskIds.flatMap((taskId) => [
        { sourceTaskId: taskId },
        { targetTaskId: taskId },
      ]),
      relations: [
        'sourceTask',
        'targetTask',
        'sourceTask.assignee',
        'sourceTask.project',
        'targetTask.assignee',
        'targetTask.project',
      ],
    });

    // Group links by task ID
    const linksByTaskId = new Map<string, TaskLinkWithTaskDto[]>();

    // Initialize empty arrays for all task IDs
    taskIds.forEach((taskId) => {
      linksByTaskId.set(taskId, []);
    });

    // Process each link and add to appropriate task groups
    links.forEach((link) => {
      const linkDto = new TaskLinkWithTaskDto({
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

      // Add to both source and target task groups
      if (linksByTaskId.has(link.sourceTaskId)) {
        linksByTaskId.get(link.sourceTaskId)!.push(linkDto);
      }
      if (linksByTaskId.has(link.targetTaskId)) {
        linksByTaskId.get(link.targetTaskId)!.push(linkDto);
      }
    });

    return linksByTaskId;
  }
}
