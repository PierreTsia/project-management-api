import { Injectable } from '@nestjs/common';
import {
  LinkValidationStrategy,
  ValidationResult,
} from './task-relationship-validation-chain';
import { Task } from '../../entities/task.entity';

@Injectable()
export class BlocksTypeValidator implements LinkValidationStrategy {
  canCreate(_sourceTask: Task, _targetTask: Task): ValidationResult {
    return { valid: true };
  }
}

@Injectable()
export class DuplicatesTypeValidator implements LinkValidationStrategy {
  canCreate(_sourceTask: Task, _targetTask: Task): ValidationResult {
    return { valid: true };
  }
}
