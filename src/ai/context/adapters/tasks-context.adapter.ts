import { Injectable } from '@nestjs/common';
import type { TaskContext } from '../models/task-context.model';
import { TasksService } from '../../../tasks/tasks.service';
import { normalizeTaskToContext } from '../normalizers/task-normalizer';
import { compareTaskContext } from '../normalizers/task-sorter';

const TASKS_CAP = 200;

@Injectable()
export class TasksContextAdapter {
  constructor(private readonly tasksService: TasksService) {}

  async getTasks(projectId: string): Promise<ReadonlyArray<TaskContext>> {
    if (!projectId) return [];
    const tasks = await this.tasksService.findAll(projectId);
    const normalized: TaskContext[] = tasks.map(normalizeTaskToContext);
    const sorted = normalized.sort(compareTaskContext);
    return sorted.slice(0, TASKS_CAP);
  }
}
