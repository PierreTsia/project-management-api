import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../../entities/task-link.entity';
import { TaskLinkType } from '../../enums/task-link-type.enum';

export interface CircularDependencyResult {
  hasCycle: boolean;
  cyclePath?: string[];
  reason?: string;
}

@Injectable()
export class CircularDependencyDetector {
  constructor(
    @InjectRepository(TaskLink)
    private readonly taskLinkRepository: Repository<TaskLink>,
  ) {}

  /**
   * Detects circular dependencies using BFS algorithm
   * @param projectId - The project ID to limit scope
   * @param sourceTaskId - The source task ID
   * @param targetTaskId - The target task ID
   * @param linkType - The type of link being created
   * @returns CircularDependencyResult indicating if a cycle would be created
   */
  async detectCircularDependency(
    projectId: string,
    sourceTaskId: string,
    targetTaskId: string,
    linkType: TaskLinkType,
  ): Promise<CircularDependencyResult> {
    // Build adjacency list for all links in the project
    const links = await this.taskLinkRepository.find({
      where: [
        { projectId, sourceTaskId },
        { projectId, targetTaskId },
      ],
    });

    // Create a temporary link object for the potential new link
    const potentialLink = {
      id: 'temp',
      projectId,
      sourceTaskId,
      targetTaskId,
      type: linkType,
      createdAt: new Date(),
    } as TaskLink;

    const graph = this.buildGraph([...links, potentialLink]);

    // Check for cycles starting from the target task
    const cyclePath = this.findCycle(targetTaskId, graph);

    if (cyclePath) {
      return {
        hasCycle: true,
        cyclePath,
        reason: `Creating this link would create a circular dependency: ${cyclePath.join(' → ')}`,
      };
    }

    return { hasCycle: false };
  }

  /**
   * Builds an adjacency list from task links
   */
  private buildGraph(links: TaskLink[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const link of links) {
      // Add directed edge based on link type
      const from = this.getFromTaskId(link);
      const to = this.getToTaskId(link);

      if (!graph.has(from)) {
        graph.set(from, []);
      }
      graph.get(from)!.push(to);
    }

    return graph;
  }

  /**
   * Determines the "from" task ID based on link type
   */
  private getFromTaskId(link: TaskLink): string {
    // For most link types, source -> target
    // For reverse types, target -> source
    const reverseTypes: TaskLinkType[] = [
      'IS_BLOCKED_BY',
      'IS_DUPLICATED_BY',
      'SPLITS_FROM',
    ];

    return reverseTypes.includes(link.type)
      ? link.targetTaskId
      : link.sourceTaskId;
  }

  /**
   * Determines the "to" task ID based on link type
   */
  private getToTaskId(link: TaskLink): string {
    const reverseTypes: TaskLinkType[] = [
      'IS_BLOCKED_BY',
      'IS_DUPLICATED_BY',
      'SPLITS_FROM',
    ];

    return reverseTypes.includes(link.type)
      ? link.sourceTaskId
      : link.targetTaskId;
  }

  /**
   * Uses BFS to find a cycle in the graph
   */
  private findCycle(
    startTaskId: string,
    graph: Map<string, string[]>,
  ): string[] | null {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (taskId: string): string[] | null => {
      if (recursionStack.has(taskId)) {
        // Found a cycle - reconstruct the path
        const cycleStart = path.indexOf(taskId);
        return path.slice(cycleStart).concat([taskId]);
      }

      if (visited.has(taskId)) {
        return null;
      }

      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      const neighbors = graph.get(taskId) || [];
      for (const neighbor of neighbors) {
        const cycle = dfs(neighbor);
        if (cycle) {
          return cycle;
        }
      }

      recursionStack.delete(taskId);
      path.pop();
      return null;
    };

    return dfs(startTaskId);
  }

  /**
   * Checks if a specific task is involved in any circular dependency
   * @param projectId - The project ID to limit scope
   * @param taskId - The task ID to check
   * @returns CircularDependencyResult indicating if the task is in a cycle
   */
  async hasCircularDependency(
    projectId: string,
    taskId: string,
  ): Promise<CircularDependencyResult> {
    const links = await this.taskLinkRepository.find({
      where: [
        { projectId, sourceTaskId: taskId },
        { projectId, targetTaskId: taskId },
      ],
    });

    const graph = this.buildGraph(links);
    const cyclePath = this.findCycle(taskId, graph);

    if (cyclePath) {
      return {
        hasCycle: true,
        cyclePath,
        reason: `Task ${taskId} is involved in a circular dependency: ${cyclePath.join(' → ')}`,
      };
    }

    return { hasCycle: false };
  }
}
