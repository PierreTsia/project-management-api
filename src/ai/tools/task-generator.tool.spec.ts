import { Test } from '@nestjs/testing';
import { TaskGeneratorTool } from './task-generator.tool';
import { LlmProviderService } from '../llm-provider.service';
import { ContextService } from '../context/context.service';
import { AiRedactionService } from '../ai.redaction.service';
import { AiTracingService } from '../ai.tracing.service';
import { CustomLogger } from '../../common/services/logger.service';
import { ValidateDatesTool } from './validate-dates.tool';
import { GenerateTasksRequestDto } from '../dto/generate-tasks.dto';

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

describe('TaskGeneratorTool', () => {
  let tool: TaskGeneratorTool;
  let llm: {
    callLLM: jest.MockedFunction<LlmProviderService['callLLM']>;
    callLLMWithStructuredOutput: jest.MockedFunction<
      LlmProviderService['callLLMWithStructuredOutput']
    >;
    getInfo: jest.MockedFunction<LlmProviderService['getInfo']>;
  };

  beforeEach(async () => {
    llm = {
      callLLM: jest.fn(),
      callLLMWithStructuredOutput: jest.fn(),
      getInfo: jest.fn(() => ({
        provider: 'mistral',
        model: 'mistral-small-latest',
      })),
    };

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
        {
          provide: ValidateDatesTool,
          useValue: {
            validateDates: jest.fn(),
          },
        },
      ],
    }).compile();

    tool = moduleRef.get(TaskGeneratorTool);
  });

  it('returns validated tasks on success', async () => {
    llm.callLLMWithStructuredOutput.mockResolvedValue({
      tasks: [
        { title: 'Do A', description: 'Desc', priority: 'HIGH' },
        { title: 'Do B', description: 'Desc', priority: 'MEDIUM' },
        { title: 'Do C', description: 'Desc', priority: 'LOW' },
      ],
    });

    const res = await tool.generateTasks(
      { prompt: 'Build X' } as GenerateTasksRequestDto,
      'user-1',
    );
    expect(res.tasks.length).toBeGreaterThanOrEqual(3);
    expect(res.meta.provider).toBe('mistral');
    expect(res.meta.model).toBe('mistral-small-latest');
    expect(res.meta.degraded).toBe(false);
  });

  it('falls back to degraded mode when parsing fails', async () => {
    llm.callLLMWithStructuredOutput.mockRejectedValue(
      new Error('Parsing failed'),
    );
    const res = await tool.generateTasks(
      { prompt: 'Build Y' } as GenerateTasksRequestDto,
      'user-1',
    );
    expect(res.tasks.length).toBeGreaterThanOrEqual(3);
    expect(res.meta.degraded).toBe(true);
  });
});
