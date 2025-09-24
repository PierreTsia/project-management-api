import { Test } from '@nestjs/testing';
import { TaskGeneratorTool } from './task-generator.tool';
import { LlmProviderService } from '../llm-provider.service';
import { ContextService } from '../context/context.service';
import { AiRedactionService } from '../ai.redaction.service';
import { AiTracingService } from '../ai.tracing.service';
import { CustomLogger } from '../../common/services/logger.service';

const tracingMock: AiTracingService = {
  withSpan: (_: string, fn: any) => fn(),
} as any;

const loggerMock: CustomLogger = {
  setContext: () => undefined,
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
} as any;

describe('TaskGeneratorTool', () => {
  let tool: TaskGeneratorTool;
  let llm: { callLLM: jest.Mock; getInfo: jest.Mock };

  beforeEach(async () => {
    llm = {
      callLLM: jest.fn(),
      getInfo: jest.fn(() => ({
        provider: 'mistral',
        model: 'mistral-small-latest',
      })),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        TaskGeneratorTool,
        { provide: LlmProviderService, useValue: llm },
        {
          provide: ContextService,
          useValue: { getProject: jest.fn(), getTasks: jest.fn() },
        },
        {
          provide: AiRedactionService,
          useValue: {
            redactProject: (p: any) => p,
            sanitizeText: (t: string) => t,
          },
        },
        { provide: AiTracingService, useValue: tracingMock },
        { provide: CustomLogger, useValue: loggerMock },
      ],
    }).compile();

    tool = moduleRef.get(TaskGeneratorTool);
  });

  it('returns validated tasks on success', async () => {
    const payload = JSON.stringify({
      tasks: [
        { title: 'Do A', description: 'Desc', priority: 'HIGH' },
        { title: 'Do B', description: 'Desc', priority: 'MEDIUM' },
        { title: 'Do C', description: 'Desc', priority: 'LOW' },
      ],
    });
    llm.callLLM.mockResolvedValue(payload);

    const res = await tool.generateTasks(
      { prompt: 'Build X' } as any,
      'user-1',
    );
    expect(res.tasks.length).toBeGreaterThanOrEqual(3);
    expect(res.meta.provider).toBe('mistral');
    expect(res.meta.model).toBe('mistral-small-latest');
    expect(res.meta.degraded).toBe(false);
  });

  it('falls back to degraded mode when parsing fails', async () => {
    llm.callLLM.mockResolvedValue('not-json');
    const res = await tool.generateTasks(
      { prompt: 'Build Y' } as any,
      'user-1',
    );
    expect(res.tasks.length).toBeGreaterThanOrEqual(3);
    expect(res.meta.degraded).toBe(true);
  });
});
