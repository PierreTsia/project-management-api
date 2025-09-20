import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../../entities/task-link.entity';
import {
  ValidationHandler,
  ValidationRequest,
  ValidationResult,
} from './task-relationship-validation-chain';
import { TASK_LINK_LIMIT } from '../../tasks.module';

@Injectable()
export class LinkLimitValidator extends ValidationHandler {
  constructor(
    @InjectRepository(TaskLink)
    private readonly taskLinkRepository: Repository<TaskLink>,
  ) {
    super();
  }

  protected async validate(
    request: ValidationRequest,
  ): Promise<ValidationResult> {
    // Count existing links for both tasks
    const existing = await this.taskLinkRepository.count({
      where: [
        { sourceTaskId: request.sourceTask.id },
        { targetTaskId: request.sourceTask.id },
        { sourceTaskId: request.targetTask.id },
        { targetTaskId: request.targetTask.id },
      ],
    });

    if (existing >= TASK_LINK_LIMIT * 2) {
      return {
        valid: false,
        reason: 'errors.task_links.link_limit_reached',
      };
    }

    return { valid: true };
  }
}
