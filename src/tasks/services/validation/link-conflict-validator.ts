import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../../entities/task-link.entity';

export interface LinkConflictResult {
  hasConflict: boolean;
  reason?: string;
}

@Injectable()
export class LinkConflictValidator {
  constructor(
    @InjectRepository(TaskLink)
    private readonly taskLinkRepository: Repository<TaskLink>,
  ) {}

  /**
   * Validates if creating a hierarchy would conflict with existing link relationships
   * @param parentTaskId - The parent task ID
   * @param childTaskId - The child task ID
   * @returns LinkConflictResult indicating if there's a conflict
   */
  async validateLinkConflict(
    parentTaskId: string,
    childTaskId: string,
  ): Promise<LinkConflictResult> {
    // Check for existing links between the tasks
    const existingLinks = await this.taskLinkRepository.find({
      where: [
        { sourceTaskId: parentTaskId, targetTaskId: childTaskId },
        { sourceTaskId: childTaskId, targetTaskId: parentTaskId },
      ],
    });

    if (existingLinks.length === 0) {
      return { hasConflict: false };
    }

    // Check each link for conflicts with hierarchy
    for (const link of existingLinks) {
      const conflict = this.checkLinkHierarchyConflict(
        link,
        parentTaskId,
        childTaskId,
      );
      if (conflict) {
        return {
          hasConflict: true,
          reason: conflict,
        };
      }
    }

    return { hasConflict: false };
  }

  /**
   * Checks if a specific link conflicts with the proposed hierarchy
   */
  private checkLinkHierarchyConflict(
    link: TaskLink,
    parentTaskId: string,
    childTaskId: string,
  ): string | null {
    const isParentToChild =
      link.sourceTaskId === parentTaskId && link.targetTaskId === childTaskId;
    const isChildToParent =
      link.sourceTaskId === childTaskId && link.targetTaskId === parentTaskId;

    switch (link.type) {
      case 'BLOCKS':
        // Parent cannot block child
        if (isParentToChild) {
          return 'A parent task cannot block its child task. Child tasks should be able to complete independently.';
        }
        break;

      case 'IS_BLOCKED_BY':
        // Child cannot be blocked by parent
        if (isChildToParent) {
          return 'A child task cannot be blocked by its parent task. Parent tasks should not block their children.';
        }
        break;

      case 'DUPLICATES':
      case 'IS_DUPLICATED_BY':
        // Tasks in hierarchy cannot duplicate each other
        return 'Tasks in a parent-child relationship cannot be duplicates of each other.';

      case 'SPLITS_TO':
        // Parent cannot split to child
        if (isParentToChild) {
          return 'A parent task cannot split to its child task. Child tasks are already subdivisions of the parent.';
        }
        break;

      case 'SPLITS_FROM':
        // Child cannot split from parent
        if (isChildToParent) {
          return 'A child task cannot split from its parent task. Parent tasks are already the main task.';
        }
        break;

      case 'RELATES_TO':
        // This is generally allowed
        break;

      default:
        break;
    }

    return null;
  }
}
