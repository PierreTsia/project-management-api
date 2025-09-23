import { Test } from '@nestjs/testing';
import { AiService } from './ai.service';
import { LlmProviderService } from './llm-provider.service';

describe('AiService', () => {
  let service: AiService;
  const mockProvider = {
    getInfo: () => ({ provider: 'mistral', model: 'mistral-small-latest' }),
    callLLM: jest.fn(async () => 'ok'),
  } as unknown as LlmProviderService;

  beforeAll(async () => {
    process.env.AI_TOOLS_ENABLED = 'true';
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: LlmProviderService, useValue: mockProvider },
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
    const result = await service.generateTasks({
      projectId: 'p1',
      requirement: 'Do X',
    });
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(result.tasks[0].title.length).toBeGreaterThan(0);
  });
});
