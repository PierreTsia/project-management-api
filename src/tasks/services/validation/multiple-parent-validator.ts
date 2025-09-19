import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskHierarchy } from '../../entities/task-hierarchy.entity';
import { HierarchyValidationHandler } from './hierarchy-validators';
import {
  HierarchyValidationRequest,
  ValidationResult,
} from './hierarchy-validators';

@Injectable()
export class MultipleParentValidator extends HierarchyValidationHandler {
  constructor(
    @InjectRepository(TaskHierarchy)
    private readonly taskHierarchyRepository: Repository<TaskHierarchy>,
  ) {
    super();
  }

  protected async validate(
    request: HierarchyValidationRequest,
  ): Promise<ValidationResult> {
    // Check if the child task already has a parent
    const existingParent = await this.taskHierarchyRepository.findOne({
      where: {
        projectId: request.projectId,
        childTaskId: request.childTask.id,
      },
    });

    if (existingParent) {
      return {
        valid: false,
        reason: 'errors.task_hierarchy.multiple_parents',
      };
    }

    return { valid: true };
  }
}
