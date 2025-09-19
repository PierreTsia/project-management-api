import { Injectable } from '@nestjs/common';
import { TaskLinkService } from './task-link.service';
import { TaskHierarchyService } from './task-hierarchy.service';
import { TaskLinkWithTaskDto } from '../dto/task-link-with-task.dto';
import { HierarchyTreeDto } from '../dto/hierarchy-tree.dto';

export interface TaskRelationships {
  links: TaskLinkWithTaskDto[];
  hierarchy: HierarchyTreeDto;
}

@Injectable()
export class TaskRelationshipHydrator {
  constructor(
    private readonly taskLinkService: TaskLinkService,
    private readonly taskHierarchyService: TaskHierarchyService,
  ) {}

  async hydrateTaskRelationships(taskId: string): Promise<TaskRelationships> {
    // Fetch both links and hierarchy in parallel for optimal performance
    const [links, hierarchy] = await Promise.all([
      this.taskLinkService.listLinksWithTasks(taskId),
      this.taskHierarchyService.getHierarchyForTask(taskId),
    ]);

    return {
      links,
      hierarchy,
    };
  }

  async hydrateMultipleTaskRelationships(
    taskIds: string[],
  ): Promise<Map<string, TaskRelationships>> {
    const results = new Map<string, TaskRelationships>();

    // Process all tasks in parallel
    const promises = taskIds.map(async (taskId) => {
      const relationships = await this.hydrateTaskRelationships(taskId);
      results.set(taskId, relationships);
    });

    await Promise.all(promises);
    return results;
  }
}
