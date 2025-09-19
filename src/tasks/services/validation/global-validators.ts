import { Injectable } from '@nestjs/common';
import {
  ValidationHandler,
  ValidationRequest,
  ValidationResult,
} from './task-relationship-validator';
import { CircularDependencyDetector } from './circular-dependency-detector';
import { HierarchyConflictValidator } from './hierarchy-conflict-validator';

@Injectable()
export class SameProjectValidator extends ValidationHandler {
  protected validate(req: ValidationRequest): ValidationResult {
    return req.sourceTask.projectId === req.targetTask.projectId &&
      req.sourceTask.projectId === req.projectId
      ? { valid: true }
      : { valid: false, reason: 'errors.task_links.not_same_project' };
  }
}

@Injectable()
export class SelfLinkingValidator extends ValidationHandler {
  protected validate(req: ValidationRequest): ValidationResult {
    return req.sourceTask.id !== req.targetTask.id
      ? { valid: true }
      : { valid: false, reason: 'errors.task_links.self_link' };
  }
}

@Injectable()
export class LinkLimitValidator extends ValidationHandler {
  constructor(private readonly maxLinksPerTask: number) {
    super();
  }
  protected validate(_req: ValidationRequest): ValidationResult {
    // Counting existing links happens in service before calling the chain; keep as stub.
    return { valid: true };
  }
}

@Injectable()
export class CircularDependencyValidator extends ValidationHandler {
  constructor(
    private readonly circularDependencyDetector: CircularDependencyDetector,
  ) {
    super();
  }

  protected async validate(req: ValidationRequest): Promise<ValidationResult> {
    const result =
      await this.circularDependencyDetector.detectCircularDependency(
        req.sourceTask.id,
        req.targetTask.id,
        req.linkType,
      );

    return result.hasCycle
      ? {
          valid: false,
          reason: result.reason || 'errors.task_links.circular_dependency',
        }
      : { valid: true };
  }
}

@Injectable()
export class HierarchyConflictValidatorHandler extends ValidationHandler {
  constructor(
    private readonly hierarchyConflictValidator: HierarchyConflictValidator,
  ) {
    super();
  }

  protected async validate(req: ValidationRequest): Promise<ValidationResult> {
    const result =
      await this.hierarchyConflictValidator.validateHierarchyConflict(
        req.sourceTask.id,
        req.targetTask.id,
        req.linkType,
      );

    return result.hasConflict
      ? {
          valid: false,
          reason: result.reason || 'errors.task_links.hierarchy_conflict',
        }
      : { valid: true };
  }
}
