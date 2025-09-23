import { Test } from '@nestjs/testing';
import { ContextService } from './context.service';
import { ProjectsContextAdapter } from './adapters/projects-context.adapter';
import { TasksContextAdapter } from './adapters/tasks-context.adapter';
import { TeamContextAdapter } from './adapters/team-context.adapter';
import { AiTracingService } from '../ai.tracing.service';

describe('ContextService', () => {
  const project = { id: 'p1', name: 'P' };
  const tasks = [
    {
      id: 't1',
      title: 'A',
      status: 'TODO',
      priority: 'HIGH',
      projectId: 'p1',
      projectName: 'P',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
    {
      id: 't2',
      title: 'B',
      status: 'TODO',
      priority: 'LOW',
      projectId: 'p1',
      projectName: 'P',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
    },
  ];

  it('aggregates and sets degraded when history empty', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContextService,
        {
          provide: ProjectsContextAdapter,
          useValue: { getProject: jest.fn().mockResolvedValue(project) },
        },
        {
          provide: TasksContextAdapter,
          useValue: { getTasks: jest.fn().mockResolvedValue(tasks) },
        },
        {
          provide: TeamContextAdapter,
          useValue: {
            getTeam: jest
              .fn()
              .mockResolvedValue([{ id: 'u1', displayName: 'U' }]),
          },
        },
        {
          provide: AiTracingService,
          useValue: { withSpan: <T>(_n: string, fn: () => Promise<T>) => fn() },
        },
      ],
    }).compile();

    const svc = moduleRef.get(ContextService);
    const res = await svc.getAggregatedContext('p1', 'u1');
    expect(res?.project).toEqual(project);
    expect(res?.tasks.length).toBe(2);
    expect(res?.team[0].id).toBe('u1');
    expect(res?.meta.degraded).toBe(true);
  });

  it('returns undefined when project not found', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContextService,
        {
          provide: ProjectsContextAdapter,
          useValue: { getProject: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: TasksContextAdapter,
          useValue: { getTasks: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: TeamContextAdapter,
          useValue: { getTeam: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: AiTracingService,
          useValue: { withSpan: <T>(_n: string, fn: () => Promise<T>) => fn() },
        },
      ],
    }).compile();

    const svc = moduleRef.get(ContextService);
    const res = await svc.getAggregatedContext('missing', 'u1');
    expect(res).toBeUndefined();
  });
});
