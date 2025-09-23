import { Test } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiMetricsService } from './ai.metrics.service';
import { ConfigService } from '@nestjs/config';
import { AiRedactionService } from './ai.redaction.service';
import { LlmProviderService } from './llm-provider.service';

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
      projectId: 'p1',
      requirement: 'X',
    } as any);
    expect(Array.isArray(res.tasks)).toBe(true);
  });
});
