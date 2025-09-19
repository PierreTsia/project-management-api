import { Injectable } from '@nestjs/common';
import { TaskLinkType } from '../../enums/task-link-type.enum';
import { Task } from '../../entities/task.entity';

export type ValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export type ValidationRequest = {
  sourceTask: Task;
  targetTask: Task;
  linkType: TaskLinkType;
  projectId: string;
};

export interface LinkValidationStrategy {
  canCreate(sourceTask: Task, targetTask: Task): ValidationResult;
}

export abstract class ValidationHandler {
  protected next?: ValidationHandler;
  setNext(handler: ValidationHandler): ValidationHandler {
    this.next = handler;
    return handler;
  }
  async handle(request: ValidationRequest): Promise<ValidationResult> {
    const result = await this.validate(request);
    if (result.valid === false) return result;
    return this.next?.handle(request) ?? { valid: true };
  }
  protected abstract validate(
    request: ValidationRequest,
  ): ValidationResult | Promise<ValidationResult>;
}

@Injectable()
export class TaskRelationshipValidationChain {
  private linkValidators = new Map<TaskLinkType, LinkValidationStrategy>();
  private validationChain: ValidationHandler | undefined;

  registerLinkValidator(
    type: TaskLinkType,
    strategy: LinkValidationStrategy,
  ): void {
    this.linkValidators.set(type, strategy);
  }

  setValidationChain(first: ValidationHandler): void {
    this.validationChain = first;
  }

  async canCreateLink(request: ValidationRequest): Promise<ValidationResult> {
    const chainResult = (await this.validationChain?.handle(request)) ?? {
      valid: true,
    };
    if (chainResult.valid === false) return chainResult;
    const strategy = this.linkValidators.get(request.linkType);
    return (
      strategy?.canCreate(request.sourceTask, request.targetTask) ?? {
        valid: true,
      }
    );
  }
}
