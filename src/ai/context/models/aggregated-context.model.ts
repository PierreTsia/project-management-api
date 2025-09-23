import type { ProjectContext } from './project-context.model';
import type { TaskContext } from './task-context.model';
import type { TeamMemberContext } from './team-member-context.model';
import type { HistoryEventContext } from './history-event-context.model';

export interface AggregatedContextMeta {
  degraded: boolean;
  tasksTruncated: boolean;
  tasksReturned: number;
  historyWindow: number;
}

export interface ProjectAggregatedContext {
  project: ProjectContext;
  tasks: ReadonlyArray<TaskContext>;
  team: ReadonlyArray<TeamMemberContext>;
  history: ReadonlyArray<HistoryEventContext>;
  meta: AggregatedContextMeta;
}
