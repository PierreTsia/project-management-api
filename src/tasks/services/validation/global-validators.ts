import { Injectable } from '@nestjs/common';
import {
  ValidationHandler,
  ValidationRequest,
  ValidationResult,
} from './task-relationship-validator';

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
