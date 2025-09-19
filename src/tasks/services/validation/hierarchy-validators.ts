import { Injectable } from '@nestjs/common';
import { Task } from '../../entities/task.entity';
import { TaskHierarchy } from '../../entities/task-hierarchy.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { LinkConflictValidator } from './link-conflict-validator';

export interface HierarchyValidationRequest {
  parentTask: Task;
  childTask: Task;
  projectId: string;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export abstract class HierarchyValidationHandler {
  protected next?: HierarchyValidationHandler;

  setNext(handler: HierarchyValidationHandler): HierarchyValidationHandler {
    this.next = handler;
    return handler;
  }

  async handle(request: HierarchyValidationRequest): Promise<ValidationResult> {
    const result = await this.validate(request);
    if (!result.valid) return result;
    return this.next?.handle(request) ?? { valid: true };
  }

  protected abstract validate(
    request: HierarchyValidationRequest,
  ): Promise<ValidationResult>;
}

@Injectable()
export class SelfHierarchyValidator extends HierarchyValidationHandler {
  protected async validate(
    request: HierarchyValidationRequest,
  ): Promise<ValidationResult> {
    if (request.parentTask.id === request.childTask.id) {
      return {
        valid: false,
        reason: 'errors.task_hierarchy.self_parent',
      };
    }
    return { valid: true };
  }
}

@Injectable()
export class CircularHierarchyValidator extends HierarchyValidationHandler {
  constructor(
    @InjectRepository(TaskHierarchy)
    private readonly taskHierarchyRepository: Repository<TaskHierarchy>,
  ) {
    super();
  }

  protected async validate(
    request: HierarchyValidationRequest,
  ): Promise<ValidationResult> {
    // Check if child is already an ancestor of parent
    const isCircular = await this.wouldCreateCircularHierarchy(
      request.parentTask.id,
      request.childTask.id,
    );

    if (isCircular) {
      return {
        valid: false,
        reason: 'errors.task_hierarchy.circular_hierarchy',
      };
    }

    return { valid: true };
  }

  private async wouldCreateCircularHierarchy(
    parentId: string,
    childId: string,
  ): Promise<boolean> {
    // BFS to find if childId is an ancestor of parentId
    const queue = [parentId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      if (currentId === childId) {
        return true; // Found circular dependency
      }

      // Get all parents of current task
      const parents = await this.taskHierarchyRepository.find({
        where: { childTaskId: currentId },
        select: ['parentTaskId'],
      });

      for (const parent of parents) {
        if (!visited.has(parent.parentTaskId)) {
          queue.push(parent.parentTaskId);
        }
      }
    }

    return false;
  }
}

@Injectable()
export class HierarchyDepthValidator extends HierarchyValidationHandler {
  private readonly MAX_DEPTH = 10;

  constructor(
    @InjectRepository(TaskHierarchy)
    private readonly taskHierarchyRepository: Repository<TaskHierarchy>,
  ) {
    super();
  }

  protected async validate(
    request: HierarchyValidationRequest,
  ): Promise<ValidationResult> {
    const currentDepth = await this.getHierarchyDepth(request.parentTask.id);

    if (currentDepth >= this.MAX_DEPTH) {
      return {
        valid: false,
        reason: 'errors.task_hierarchy.max_depth_exceeded',
        // Add depth info to reason for better error messages
      };
    }

    return { valid: true };
  }

  private async getHierarchyDepth(taskId: string): Promise<number> {
    // Count how many levels up from this task
    let depth = 0;
    let currentTaskId = taskId;
    const visited = new Set<string>();

    while (currentTaskId && !visited.has(currentTaskId)) {
      visited.add(currentTaskId);

      const parent = await this.taskHierarchyRepository.findOne({
        where: { childTaskId: currentTaskId },
        select: ['parentTaskId'],
      });

      if (parent) {
        depth++;
        currentTaskId = parent.parentTaskId;
      } else {
        break;
      }
    }

    return depth;
  }
}

@Injectable()
export class HierarchyConflictValidator extends HierarchyValidationHandler {
  constructor(
    @InjectRepository(TaskHierarchy)
    private readonly taskHierarchyRepository: Repository<TaskHierarchy>,
  ) {
    super();
  }

  protected async validate(
    request: HierarchyValidationRequest,
  ): Promise<ValidationResult> {
    // Check if tasks are already in a hierarchy relationship
    const existingHierarchy = await this.taskHierarchyRepository.findOne({
      where: [
        {
          parentTaskId: request.parentTask.id,
          childTaskId: request.childTask.id,
        },
        {
          parentTaskId: request.childTask.id,
          childTaskId: request.parentTask.id,
        },
      ],
    });

    if (existingHierarchy) {
      return {
        valid: false,
        reason: 'errors.task_hierarchy.already_exists',
      };
    }

    return { valid: true };
  }
}

@Injectable()
export class LinkConflictValidatorForHierarchy extends HierarchyValidationHandler {
  constructor(private readonly linkConflictValidator: LinkConflictValidator) {
    super();
  }

  protected async validate(
    request: HierarchyValidationRequest,
  ): Promise<ValidationResult> {
    const result = await this.linkConflictValidator.validateLinkConflict(
      request.parentTask.id,
      request.childTask.id,
    );

    if (result.hasConflict) {
      return {
        valid: false,
        reason: result.reason || 'errors.task_hierarchy.link_conflict',
      };
    }

    return { valid: true };
  }
}
