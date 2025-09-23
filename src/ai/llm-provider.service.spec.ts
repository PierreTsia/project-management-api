import { Test } from '@nestjs/testing';
import { LlmProviderService } from './llm-provider.service';
import { ConfigService } from '@nestjs/config';
import { ProviderFactory } from './provider.factory';
import { AiTracingService } from './ai.tracing.service';

describe('LlmProviderService', () => {
  let svc: LlmProviderService;
  const factoryMock = {
    get: () => ({
      getInfo: () => ({ provider: 'mistral', model: 'mistral-small-latest' }),
      complete: jest.fn(async () => 'ok'),
    }),
  } as unknown as ProviderFactory;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        LlmProviderService,
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: ProviderFactory, useValue: factoryMock },
        {
          provide: AiTracingService,
          useValue: { withSpan: (_: string, fn: any) => fn() },
        },
      ],
    }).compile();
    svc = moduleRef.get(LlmProviderService);
  });

  it('getInfo proxies to provider', () => {
    const info = svc.getInfo();
    expect(info.provider).toBe('mistral');
  });

  it('callLLM executes completion', async () => {
    const res = await svc.callLLM([{ role: 'user', content: 'hi' } as any]);
    expect(res).toBe('ok');
  });
});
