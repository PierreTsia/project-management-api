import { Test } from '@nestjs/testing';
import { TaskRelationshipGeneratorTool } from './task-relationship-generator.tool';
import { LlmProviderService } from '../llm-provider.service';
import { AiTracingService } from '../ai.tracing.service';
import { CustomLogger } from '../../common/services/logger.service';
import { TasksService } from '../../tasks/tasks.service';
import { TaskLinkService } from '../../tasks/services/task-link.service';
import { TaskGeneratorTool } from './task-generator.tool';
import { ServiceUnavailableException } from '@nestjs/common';

// Mock LangChain symbols used in the tool
jest.mock('langchain', () => ({
  initChatModel: jest.fn(),
  SystemMessage: jest
    .fn()
    .mockImplementation((content) => ({ content, _getType: () => 'system' })),
  HumanMessage: jest
    .fn()
    .mockImplementation((content) => ({ content, _getType: () => 'human' })),
}));

import { initChatModel } from 'langchain';

const tracingMock: AiTracingService = {
  withSpan: (_: string, fn: () => unknown) => fn(),
} as AiTracingService;

const loggerMock = {
  setContext: () => undefined,
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  verbose: () => undefined,
  options: {},
  localInstance: null,
  fatal: () => undefined,
  registerLocalInstanceRef: () => undefined,
} as unknown as CustomLogger;

describe('TaskRelationshipGeneratorTool', () => {
  let tool: TaskRelationshipGeneratorTool;

  let llm: {
    getInfo: jest.MockedFunction<LlmProviderService['getInfo']>;
  } & Record<string, any>;

  let tasksService: { createMany: jest.Mock };
  let linkService: { createLink: jest.Mock };
  let taskGenTool: { generateTasks: jest.Mock };

  beforeEach(async () => {
    llm = {
      getInfo: jest.fn(() => ({
        provider: 'mistral',
        model: 'mistral-small-latest',
      })),
    } as any;

    tasksService = { createMany: jest.fn() };
    linkService = { createLink: jest.fn() };
    taskGenTool = { generateTasks: jest.fn() } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskRelationshipGeneratorTool,
        { provide: LlmProviderService, useValue: llm },
        { provide: AiTracingService, useValue: tracingMock },
        { provide: CustomLogger, useValue: loggerMock },
        { provide: TasksService, useValue: tasksService },
        { provide: TaskLinkService, useValue: linkService },
        { provide: TaskGeneratorTool, useValue: taskGenTool },
      ],
    }).compile();

    tool = moduleRef.get(TaskRelationshipGeneratorTool);

    // Default chat model mock
    (initChatModel as jest.Mock).mockResolvedValue({
      invoke: jest.fn().mockResolvedValue({
        content:
          '[{ "sourceTask": "task_1", "targetTask": "task_2", "type": "BLOCKS" }]',
      }),
    });

    process.env.AI_TOOLS_ENABLED = 'true';
  });

  it('generatePreview returns tasks and relationships (FR locale)', async () => {
    taskGenTool.generateTasks.mockResolvedValue({
      tasks: [
        { title: 'Rechercher', description: 'Desc', priority: 'HIGH' },
        { title: 'Comparer', description: 'Desc', priority: 'HIGH' },
      ],
    });

    const res = await tool.generatePreview(
      { prompt: 'Sujet', projectId: 'p1', generateRelationships: true },
      'user-1',
      'fr',
    );

    expect(Array.isArray(res.tasks)).toBe(true);
    expect(res.tasks.length).toBeGreaterThan(0);
    expect(res.relationships?.length).toBeGreaterThan(0);
    expect(res.meta.placeholderMode).toBe(true);
  });

  it('confirmAndCreate creates links and reports rejections', async () => {
    // Prepare created tasks with ids
    tasksService.createMany.mockResolvedValue([
      { id: 't1', title: 'A', projectId: 'p1' },
      { id: 't2', title: 'B', projectId: 'p1' },
    ]);

    // First link ok, second duplicate error
    linkService.createLink.mockResolvedValueOnce({});
    linkService.createLink.mockRejectedValueOnce(new Error('duplicate'));

    const res = await tool.confirmAndCreate({
      projectId: 'p1',
      tasks: [
        { title: 'A', priority: 'HIGH' },
        { title: 'B', priority: 'MEDIUM' },
      ],
      relationships: [
        { sourceTask: 'task_1', targetTask: 'task_2', type: 'BLOCKS' },
        { sourceTask: 'task_2', targetTask: 'task_1', type: 'BLOCKS' },
      ],
    } as any);

    expect(res.createdLinks).toBe(1);
    expect(res.rejectedLinks).toBe(1);
    expect(res.rejectedRelationships?.[0].reasonCode).toBe('DUPLICATE');
  });

  it('generatePreview throws when AI is disabled', async () => {
    process.env.AI_TOOLS_ENABLED = 'false';
    await expect(
      tool.generatePreview({ prompt: 'x', projectId: 'p1' }, 'u1', 'fr'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    process.env.AI_TOOLS_ENABLED = 'true';
  });
});
