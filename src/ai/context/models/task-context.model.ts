import type { ContextTaskStatus } from './context-task-status.model';
import type { ContextTaskPriority } from './context-task-priority.model';
import type { TaskLinkContext } from './task-link-context.model';
import type { TaskHierarchyEdgeContext } from './task-hierarchy-edge-context.model';

export interface TaskContext {
  id: string;
  title: string;
  description?: string;
  status: ContextTaskStatus;
  priority: ContextTaskPriority;
  dueDate?: string;
  projectId: string;
  projectName: string;
  assigneeId?: string;
  assigneeDisplayName?: string;
  createdAt: string;
  updatedAt: string;
  links?: ReadonlyArray<TaskLinkContext>;
  parents?: ReadonlyArray<TaskHierarchyEdgeContext>;
  children?: ReadonlyArray<TaskHierarchyEdgeContext>;
}
