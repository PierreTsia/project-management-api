import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../../entities/task-link.entity';
import {
  ValidationHandler,
  ValidationRequest,
  ValidationResult,
} from './task-relationship-validator';

@Injectable()
export class OneRelationshipPerPairValidator extends ValidationHandler {
  constructor(
    @InjectRepository(TaskLink)
    private readonly taskLinkRepository: Repository<TaskLink>,
  ) {
    super();
  }

  protected async validate(
    request: ValidationRequest,
  ): Promise<ValidationResult> {
    // Check for any existing link between these two tasks (in either direction)
    const existingLink = await this.taskLinkRepository.findOne({
      where: [
        {
          projectId: request.projectId,
          sourceTaskId: request.sourceTask.id,
          targetTaskId: request.targetTask.id,
        },
        {
          projectId: request.projectId,
          sourceTaskId: request.targetTask.id,
          targetTaskId: request.sourceTask.id,
        },
      ],
    });

    if (existingLink) {
      return {
        valid: false,
        reason: 'errors.task_links.duplicate_relationship',
      };
    }

    return { valid: true };
  }
}
