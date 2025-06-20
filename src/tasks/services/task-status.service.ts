import { Injectable, BadRequestException } from '@nestjs/common';
import { TaskStatus } from '../enums/task-status.enum';

@Injectable()
export class TaskStatusService {
  /**
   * Validates if a status transition is allowed
   * Follows proper workflow: TODO -> IN_PROGRESS -> DONE
   */
  validateStatusTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
  ): boolean {
    // Same status is always valid
    if (currentStatus === newStatus) {
      return true;
    }

    // Define valid transitions
    const validTransitions = {
      [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.TODO, TaskStatus.DONE],
      [TaskStatus.DONE]: [TaskStatus.IN_PROGRESS],
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Gets the next valid statuses for a given current status
   */
  getValidNextStatuses(currentStatus: TaskStatus): TaskStatus[] {
    const validTransitions = {
      [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.TODO, TaskStatus.DONE],
      [TaskStatus.DONE]: [TaskStatus.IN_PROGRESS],
    };

    return validTransitions[currentStatus] || [];
  }

  /**
   * Validates and throws exception if transition is invalid
   */
  validateAndThrowIfInvalid(
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
  ): void {
    if (!this.validateStatusTransition(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
