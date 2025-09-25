import { Test } from '@nestjs/testing';
import { AiService } from './ai.service';
import { LlmProviderService } from './llm-provider.service';
import { TaskGeneratorTool } from './tools/task-generator.tool';
import { TaskRelationshipGeneratorTool } from './tools/task-relationship-generator.tool';

describe('AiService', () => {
  let service: AiService;
  const mockProvider = {
    getInfo: () => ({ provider: 'mistral', model: 'mistral-small-latest' }),
    callLLM: jest.fn(async () => 'ok'),
  } as unknown as LlmProviderService;

  const mockTaskGeneratorTool = {
    generateTasks: jest.fn(),
  } as unknown as TaskGeneratorTool;

  const mockTaskRelationshipTool = {
    generatePreview: jest.fn(),
    confirmAndCreate: jest.fn(),
  } as unknown as TaskRelationshipGeneratorTool;

  beforeAll(async () => {
    process.env.AI_TOOLS_ENABLED = 'true';
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: LlmProviderService, useValue: mockProvider },
        { provide: TaskGeneratorTool, useValue: mockTaskGeneratorTool },
        {
          provide: TaskRelationshipGeneratorTool,
          useValue: mockTaskRelationshipTool,
        },
      ],
    }).compile();
    service = moduleRef.get(AiService);
  });

  it('getHello returns provider/model/message', async () => {
    const result = await service.getHello('Tester');
    expect(result.provider).toBe('mistral');
    expect(result.model).toBe('mistral-small-latest');
    expect(result.message).toBe('hello Tester');
  });

  it('checkProjectHealth returns basic shape', async () => {
    const result = await service.checkProjectHealth({ projectId: 'p1' });
    expect(typeof result.healthScore).toBe('number');
    expect(Array.isArray(result.risks)).toBe(true);
  });

  it('generateTasks returns a list of tasks', async () => {
    (mockTaskGeneratorTool.generateTasks as jest.Mock).mockResolvedValueOnce({
      tasks: [
        {
          title: 'Test task 1',
          description: 'Test description',
          priority: 'HIGH',
        },
        { title: 'Test task 2', priority: 'MEDIUM' },
      ],
      meta: {
        model: 'mistral-small-latest',
        provider: 'mistral',
        degraded: false,
      },
    });
    const result = await service.generateTasks({
      prompt: 'Create a user authentication system',
      projectId: 'p1',
    });
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(result.tasks[0].title).toBe('Test task 1');
    expect(result.meta.provider).toBe('mistral');
  });

  it('generateTasks forwards locale and options', async () => {
    (mockTaskGeneratorTool.generateTasks as jest.Mock).mockResolvedValueOnce({
      tasks: [{ title: 'Foo' }, { title: 'Bar' }, { title: 'Baz' }],
      meta: {
        model: 'mistral-small-latest',
        provider: 'mistral',
        degraded: false,
        locale: 'fr',
        options: {
          taskCount: 6,
          minPriority: 'MEDIUM',
        },
      },
    });

    const payload = {
      prompt: 'Sujet en français',
      projectId: 'p2',
      locale: 'fr',
      options: { taskCount: 6, minPriority: 'MEDIUM' as const },
    };
    const result = await service.generateTasks(payload);

    expect(mockTaskGeneratorTool.generateTasks).toHaveBeenCalledWith(
      payload,
      undefined,
    );
    expect(result.meta.locale).toBe('fr');
    expect(result.meta.options).toEqual({
      taskCount: 6,
      minPriority: 'MEDIUM',
    });
  });
});
