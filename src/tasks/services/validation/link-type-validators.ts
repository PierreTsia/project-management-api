import { Injectable } from '@nestjs/common';
import {
  LinkValidationStrategy,
  ValidationResult,
} from './task-relationship-validator';
import { Task } from '../../entities/task.entity';

@Injectable()
export class BlocksLinkValidator implements LinkValidationStrategy {
  canCreate(_sourceTask: Task, _targetTask: Task): ValidationResult {
    return { valid: true };
  }
}

@Injectable()
export class DuplicatesLinkValidator implements LinkValidationStrategy {
  canCreate(_sourceTask: Task, _targetTask: Task): ValidationResult {
    return { valid: true };
  }
}
