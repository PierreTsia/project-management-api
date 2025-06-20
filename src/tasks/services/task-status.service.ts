import { Injectable, BadRequestException } from '@nestjs/common';
import { TaskStatus } from '../enums/task-status.enum';

@Injectable()
export class TaskStatusService {
  /**
   * Validates if a status transition is allowed
   * All transitions are allowed (including backwards) as per requirements
   */
  validateStatusTransition(
    _currentStatus: TaskStatus,
    _newStatus: TaskStatus,
  ): boolean {
    // All status transitions are allowed (including backwards)
    // TODO -> IN_PROGRESS -> DONE
    // DONE -> IN_PROGRESS -> TODO
    // Any direct transition is valid
    return true;
  }

  /**
   * Gets the next valid statuses for a given current status
   */
  getValidNextStatuses(currentStatus: TaskStatus): TaskStatus[] {
    return Object.values(TaskStatus).filter(
      (status) => status !== currentStatus,
    );
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
