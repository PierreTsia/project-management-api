import { Test } from '@nestjs/testing';
import { ProviderFactory } from './provider.factory';
import { MistralProvider } from './providers/mistral.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { LangchainProvider } from './providers/langchain.provider';
import { ConfigService } from '@nestjs/config';

describe('ProviderFactory', () => {
  it('returns Mistral by default', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProviderFactory,
        MistralProvider,
        OpenAiProvider,
        LangchainProvider,
        { provide: ConfigService, useValue: { get: () => 'mistral' } },
      ],
    }).compile();

    const factory = moduleRef.get(ProviderFactory);
    const provider = factory.get();
    expect(provider.getInfo().provider).toBe('mistral');
  });

  it('returns OpenAI when configured', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProviderFactory,
        MistralProvider,
        OpenAiProvider,
        LangchainProvider,
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) =>
              k === 'LLM_PROVIDER' ? 'openai' : 'gpt-4o-mini',
          },
        },
      ],
    }).compile();

    const factory = moduleRef.get(ProviderFactory);
    const provider = factory.get();
    expect(provider.getInfo().provider).toBe('openai');
  });
});
