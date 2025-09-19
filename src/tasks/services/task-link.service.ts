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
import { I18nService } from 'nestjs-i18n';
import { TaskRelationshipValidator } from './validation/task-relationship-validator';
import { Task } from '../entities/task.entity';

@Injectable()
export class TaskLinkService {
  constructor(
    @InjectRepository(TaskLink)
    private readonly taskLinkRepository: Repository<TaskLink>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly i18n: I18nService,
    private readonly relationshipValidator: TaskRelationshipValidator,
  ) {}

  async createLink(input: CreateTaskLinkDto): Promise<TaskLink> {
    // Load minimal task projections to validate
    const [sourceTask, targetTask] = await Promise.all([
      this.taskRepository.findOne({ where: { id: input.sourceTaskId } }),
      this.taskRepository.findOne({ where: { id: input.targetTaskId } }),
    ]);

    // Basic link count check for limit (could be optimized with count query)
    const existing = await this.taskLinkRepository.count({
      where: [
        { sourceTaskId: input.sourceTaskId },
        { targetTaskId: input.sourceTaskId },
        { sourceTaskId: input.targetTaskId },
        { targetTaskId: input.targetTaskId },
      ],
    });
    if (existing >= 40) {
      // 20 per task on both sides conservatively
      throw new BadRequestException(
        this.i18n.t('errors.task_links.link_limit_reached', {
          args: { limit: 20 },
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
      throw new BadRequestException(
        this.i18n.t(validation.reason || 'errors.task_links.invalid'),
      );
    }

    const entity = this.taskLinkRepository.create({
      projectId: input.projectId,
      sourceTaskId: input.sourceTaskId,
      targetTaskId: input.targetTaskId,
      type: input.type,
    });
    return this.taskLinkRepository.save(entity);
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
}
