import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../entities/task-link.entity';
import { CreateTaskLinkDto } from '../dto/create-task-link.dto';
import { TaskLinkResponseDto } from '../dto/task-link-response.dto';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class TaskLinkService {
  constructor(
    @InjectRepository(TaskLink)
    private readonly taskLinkRepository: Repository<TaskLink>,
    private readonly i18n: I18nService,
  ) {}

  async createLink(input: CreateTaskLinkDto): Promise<TaskLink> {
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
}
