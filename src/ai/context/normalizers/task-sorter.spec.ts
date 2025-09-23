import { compareTaskContext } from './task-sorter';
import type { TaskContext } from '../models/task-context.model';

function makeTask(
  id: string,
  priority: TaskContext['priority'],
  updatedAt: string,
  title: string,
): TaskContext {
  return {
    id,
    title,
    status: 'TODO',
    priority,
    projectId: 'p1',
    projectName: 'P',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt,
  };
}

describe('compareTaskContext', () => {
  it('sorts by priority DESC, then updatedAt DESC, then title ASC', () => {
    const items: TaskContext[] = [
      makeTask('1', 'LOW', '2024-01-02T00:00:00.000Z', 'B'),
      makeTask('2', 'HIGH', '2024-01-01T00:00:00.000Z', 'C'),
      makeTask('3', 'HIGH', '2024-01-03T00:00:00.000Z', 'A'),
      makeTask('4', 'MEDIUM', '2024-01-04T00:00:00.000Z', 'D'),
      makeTask('5', 'MEDIUM', '2024-01-04T00:00:00.000Z', 'A'),
    ];

    const sorted = [...items].sort(compareTaskContext);

    expect(sorted.map((t) => t.id)).toEqual(['3', '2', '5', '4', '1']);
  });
});
