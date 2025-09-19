import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../entities/task-link.entity';
import { CreateTaskLinkDto } from '../dto/create-task-link.dto';
import { TaskLinkResponseDto } from '../dto/task-link-response.dto';

@Injectable()
export class TaskLinkService {
  constructor(
    @InjectRepository(TaskLink)
    private readonly taskLinkRepository: Repository<TaskLink>,
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
}
