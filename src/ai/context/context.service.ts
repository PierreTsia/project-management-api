import { Injectable } from '@nestjs/common';
import type { ProjectContext } from './models/project-context.model';
import type { TaskContext } from './models/task-context.model';
import type { TeamMemberContext } from './models/team-member-context.model';
import type { HistoryEventContext } from './models/history-event-context.model';
import type { ProjectAggregatedContext } from './models/aggregated-context.model';
import { ProjectsContextAdapter } from './adapters/projects-context.adapter';
import { TasksContextAdapter } from './adapters/tasks-context.adapter';
import { TeamContextAdapter } from './adapters/team-context.adapter';

const DEFAULT_HISTORY_WINDOW = 20;
const TASKS_CAP = 200;

@Injectable()
export class ContextService {
  constructor(
    private readonly projectsAdapter: ProjectsContextAdapter,
    private readonly tasksAdapter: TasksContextAdapter,
    private readonly teamAdapter: TeamContextAdapter,
  ) {}
  async getProject(projectId: string): Promise<ProjectContext | undefined> {
    if (!projectId) {
      return undefined;
    }
    return this.projectsAdapter.getProject(projectId);
  }

  async getTasks(projectId: string): Promise<ReadonlyArray<TaskContext>> {
    if (!projectId) {
      return [];
    }
    const tasks = await this.tasksAdapter.getTasks(projectId);
    return tasks;
  }

  async getTeam(projectId: string): Promise<ReadonlyArray<TeamMemberContext>> {
    if (!projectId) {
      return [];
    }
    return this.teamAdapter.getTeam(projectId);
  }

  async getRecentHistory(
    projectId: string,
    _window: number = DEFAULT_HISTORY_WINDOW,
  ): Promise<ReadonlyArray<HistoryEventContext>> {
    if (!projectId) {
      return [];
    }
    // TODO: best-effort history retrieval; return [] on failure
    return [];
  }

  async getAggregatedContext(
    projectId: string,
  ): Promise<ProjectAggregatedContext | undefined> {
    const project = await this.getProject(projectId);
    if (!project) {
      return undefined;
    }
    const tasks = await this.getTasks(projectId);
    const team = await this.getTeam(projectId);
    const history = await this.getRecentHistory(projectId);
    const meta = {
      degraded: history.length === 0,
      tasksTruncated: tasks.length > TASKS_CAP,
      tasksReturned: Math.min(tasks.length, TASKS_CAP),
      historyWindow: DEFAULT_HISTORY_WINDOW,
    };
    return {
      project,
      tasks: tasks.slice(0, TASKS_CAP),
      team,
      history,
      meta,
    };
  }
}
