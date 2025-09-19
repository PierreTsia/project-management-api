import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskHierarchy } from '../../entities/task-hierarchy.entity';
import { TaskLinkType } from '../../enums/task-link-type.enum';

export interface HierarchyConflictResult {
  hasConflict: boolean;
  reason?: string;
}

@Injectable()
export class HierarchyConflictValidator {
  constructor(
    @InjectRepository(TaskHierarchy)
    private readonly taskHierarchyRepository: Repository<TaskHierarchy>,
  ) {}

  /**
   * Validates if creating a link would conflict with existing hierarchy relationships
   * @param sourceTaskId - The source task ID
   * @param targetTaskId - The target task ID
   * @param linkType - The type of link being created
   * @returns HierarchyConflictResult indicating if there's a conflict
   */
  async validateHierarchyConflict(
    sourceTaskId: string,
    targetTaskId: string,
    linkType: TaskLinkType,
  ): Promise<HierarchyConflictResult> {
    // Check if tasks are in a parent-child relationship
    const hierarchyRelationship = await this.getHierarchyRelationship(
      sourceTaskId,
      targetTaskId,
    );

    if (!hierarchyRelationship) {
      return { hasConflict: false };
    }

    // Check for specific conflicts based on link type and hierarchy
    const conflict = this.checkLinkTypeHierarchyConflict(
      linkType,
      hierarchyRelationship,
    );

    if (conflict) {
      return {
        hasConflict: true,
        reason: conflict,
      };
    }

    return { hasConflict: false };
  }

  /**
   * Determines the hierarchy relationship between two tasks
   * @returns 'parent-child' if source is parent of target, 'child-parent' if target is parent of source, null if no relationship
   */
  private async getHierarchyRelationship(
    sourceTaskId: string,
    targetTaskId: string,
  ): Promise<'parent-child' | 'child-parent' | null> {
    // Check if source is parent of target
    const sourceAsParent = await this.taskHierarchyRepository.findOne({
      where: {
        parentTaskId: sourceTaskId,
        childTaskId: targetTaskId,
      },
    });

    if (sourceAsParent) {
      return 'parent-child';
    }

    // Check if target is parent of source
    const targetAsParent = await this.taskHierarchyRepository.findOne({
      where: {
        parentTaskId: targetTaskId,
        childTaskId: sourceTaskId,
      },
    });

    if (targetAsParent) {
      return 'child-parent';
    }

    return null;
  }

  /**
   * Checks for conflicts between link types and hierarchy relationships
   */
  private checkLinkTypeHierarchyConflict(
    linkType: TaskLinkType,
    hierarchyRelationship: 'parent-child' | 'child-parent',
  ): string | null {
    switch (linkType) {
      case 'BLOCKS':
        // Parent cannot block child (child should be able to complete independently)
        if (hierarchyRelationship === 'parent-child') {
          return 'A parent task cannot block its child task. Child tasks should be able to complete independently.';
        }
        break;

      case 'IS_BLOCKED_BY':
        // Child cannot be blocked by parent (parent should not block child)
        if (hierarchyRelationship === 'child-parent') {
          return 'A child task cannot be blocked by its parent task. Parent tasks should not block their children.';
        }
        break;

      case 'DUPLICATES':
      case 'IS_DUPLICATED_BY':
        // Tasks in hierarchy cannot duplicate each other
        return 'Tasks in a parent-child relationship cannot be duplicates of each other.';

      case 'SPLITS_TO':
        // Parent cannot split to child (child is already a subdivision)
        if (hierarchyRelationship === 'parent-child') {
          return 'A parent task cannot split to its child task. Child tasks are already subdivisions of the parent.';
        }
        break;

      case 'SPLITS_FROM':
        // Child cannot split from parent (parent is already the main task)
        if (hierarchyRelationship === 'child-parent') {
          return 'A child task cannot split from its parent task. Parent tasks are already the main task.';
        }
        break;

      case 'RELATES_TO':
        // This is generally allowed, but we could add specific rules if needed
        break;

      default:
        break;
    }

    return null;
  }

  /**
   * Checks if two tasks can be linked based on their hierarchy relationship
   */
  async canLinkTasks(
    sourceTaskId: string,
    targetTaskId: string,
    linkType: TaskLinkType,
  ): Promise<HierarchyConflictResult> {
    return this.validateHierarchyConflict(sourceTaskId, targetTaskId, linkType);
  }

  /**
   * Gets all hierarchy conflicts for a specific task
   */
  async getHierarchyConflicts(taskId: string): Promise<{
    asParent: string[];
    asChild: string[];
  }> {
    const [asParent, asChild] = await Promise.all([
      this.taskHierarchyRepository.find({
        where: { parentTaskId: taskId },
        select: ['childTaskId'],
      }),
      this.taskHierarchyRepository.find({
        where: { childTaskId: taskId },
        select: ['parentTaskId'],
      }),
    ]);

    return {
      asParent: asParent.map((h) => h.childTaskId),
      asChild: asChild.map((h) => h.parentTaskId),
    };
  }
}
