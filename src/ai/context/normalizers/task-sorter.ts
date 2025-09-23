import type { TaskContext } from '../models/task-context.model';

const PRIORITY_WEIGHT: Record<TaskContext['priority'], number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function compareTaskContext(a: TaskContext, b: TaskContext): number {
  const aP = PRIORITY_WEIGHT[a.priority];
  const bP = PRIORITY_WEIGHT[b.priority];
  if (aP !== bP) return bP - aP; // priority DESC
  const updatedCompare = b.updatedAt.localeCompare(a.updatedAt); // updatedAt DESC
  if (updatedCompare !== 0) return updatedCompare;
  return a.title.localeCompare(b.title); // title ASC
}
