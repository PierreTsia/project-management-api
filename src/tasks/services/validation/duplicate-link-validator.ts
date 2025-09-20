import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../../entities/task-link.entity';
import { TaskLinkType } from '../../enums/task-link-type.enum';
import {
  ValidationHandler,
  ValidationRequest,
  ValidationResult,
} from './task-relationship-validation-chain';

@Injectable()
export class DuplicateLinkValidator extends ValidationHandler {
  constructor(
    @InjectRepository(TaskLink)
    private readonly taskLinkRepository: Repository<TaskLink>,
  ) {
    super();
  }

  protected async validate(
    request: ValidationRequest,
  ): Promise<ValidationResult> {
    const inverseLinkType = this.getInverseLinkType(request.linkType);

    // Check for existing links in all possible combinations
    const existingLink = await this.taskLinkRepository.findOne({
      where: [
        {
          projectId: request.projectId,
          sourceTaskId: request.sourceTask.id,
          targetTaskId: request.targetTask.id,
          type: request.linkType,
        },
        {
          projectId: request.projectId,
          sourceTaskId: request.sourceTask.id,
          targetTaskId: request.targetTask.id,
          type: inverseLinkType,
        },
        {
          projectId: request.projectId,
          sourceTaskId: request.targetTask.id,
          targetTaskId: request.sourceTask.id,
          type: inverseLinkType,
        },
      ],
    });

    if (existingLink) {
      return {
        valid: false,
        reason: 'errors.task_links.already_exists',
      };
    }

    return { valid: true };
  }

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
}
