import type { Task } from '../../../tasks/entities/task.entity';
import type { TaskContext } from '../models/task-context.model';

export function normalizeTaskToContext(task: Task): TaskContext {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : undefined,
    projectId: task.projectId,
    projectName: task.project?.name ?? '',
    assigneeId: task.assigneeId,
    assigneeDisplayName: task.assignee?.name,
    createdAt: new Date(task.createdAt).toISOString(),
    updatedAt: new Date(task.updatedAt).toISOString(),
  };
}
