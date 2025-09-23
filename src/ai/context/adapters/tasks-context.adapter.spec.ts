import { TasksContextAdapter } from './tasks-context.adapter';
import { TasksService } from '../../../tasks/tasks.service';

function fakeTask(id: number) {
  return {
    id: String(id),
    title: `Task ${id}`,
    description: null,
    status: 'TODO',
    priority: id % 3 === 0 ? 'HIGH' : id % 3 === 1 ? 'MEDIUM' : 'LOW',
    dueDate: null,
    projectId: 'p1',
    project: { name: 'Project' },
    assigneeId: null,
    assignee: null,
    createdAt: new Date(2024, 0, 1),
    updatedAt: new Date(2024, 0, id),
  } as any;
}

describe('TasksContextAdapter', () => {
  it('maps, sorts and caps at 200', async () => {
    const mockService: Partial<TasksService> = {
      findAll: async () =>
        Array.from({ length: 250 }, (_, i) => fakeTask(i + 1)),
    };
    const adapter = new TasksContextAdapter(mockService as TasksService);
    const tasks = await adapter.getTasks('p1');
    expect(tasks.length).toBe(200);
    // Ensure sorted by comparator: highest priority and latest updated first
    expect(tasks[0].priority).toBe('HIGH');
  });
});
