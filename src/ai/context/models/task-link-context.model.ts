import type { ContextTaskLinkType } from './context-task-link-type.model';

export interface TaskLinkContext {
  id: string;
  projectId: string;
  sourceTaskId: string;
  targetTaskId: string;
  type: ContextTaskLinkType;
  createdAt: string;
}
