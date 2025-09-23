import { Test } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiMetricsService } from './ai.metrics.service';
import { ConfigService } from '@nestjs/config';
import { AiRedactionService } from './ai.redaction.service';
import { LlmProviderService } from './llm-provider.service';
import { ContextService } from './context/context.service';

describe('AiController', () => {
  let controller: AiController;

  const mockService: Partial<Record<keyof AiService, any>> = {
    getHello: jest.fn(async (name?: string) => ({
      provider: 'mistral',
      model: 'mistral-small-latest',
      message: name ? `hello ${name}` : 'hello',
    })),
    checkProjectHealth: jest.fn(async () => ({
      healthScore: 70,
      risks: [],
      recommendations: [],
    })),
    generateTasks: jest.fn(async () => ({ tasks: [] })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        { provide: AiService, useValue: mockService },
        AiMetricsService,
        AiRedactionService,
        {
          provide: ContextService,
          useValue: { getAggregatedContext: jest.fn() },
        },
        {
          provide: LlmProviderService,
          useValue: {
            getInfo: () => ({
              provider: 'mistral',
              model: 'mistral-small-latest',
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(
              (key: string, defaultValue?: any) => defaultValue ?? undefined,
            ),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(AiController);
  });

  it('hello echoes name', async () => {
    const res = await controller.postHello({ name: 'Alice' });
    expect(res.message).toBe('hello Alice');
  });

  it('project health returns shape', async () => {
    const res = await controller.checkProjectHealth({ projectId: 'p1' } as any);
    expect(typeof res.healthScore).toBe('number');
  });

  it('generate tasks returns array', async () => {
    const res = await controller.generateTasks({
      prompt: 'Create a user authentication system',
      projectId: 'p1',
    });
    expect(Array.isArray(res.tasks)).toBe(true);
  });

  it('hello records error path when service throws', async () => {
    const failing = {
      ...mockService,
      getHello: jest.fn(async () => {
        const err: any = new Error('x');
        err.code = 'AI_DISABLED';
        throw err;
      }),
    } as any;
    const moduleRef = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        { provide: AiService, useValue: failing },
        AiMetricsService,
        AiRedactionService,
        {
          provide: ContextService,
          useValue: { getAggregatedContext: jest.fn() },
        },
        {
          provide: LlmProviderService,
          useValue: {
            getInfo: () => ({
              provider: 'mistral',
              model: 'mistral-small-latest',
            }),
          },
        },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    const ctrl = moduleRef.get(AiController);
    await expect(ctrl.postHello({ name: 'A' })).rejects.toBeTruthy();
  });
});
