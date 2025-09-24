import { Test, TestingModule } from '@nestjs/testing';
import { ProviderFactory } from './provider.factory';
import { LangchainProvider } from './providers/langchain.provider';
import { ConfigService } from '@nestjs/config';

describe('ProviderFactory', () => {
  let factory: ProviderFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderFactory,
        LangchainProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'LLM_PROVIDER') return 'mistral';
              if (key === 'LLM_MODEL') return 'mistral-small-latest';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    factory = module.get<ProviderFactory>(ProviderFactory);
  });

  it('should return LangchainProvider', () => {
    const provider = factory.get();
    expect(provider).toBeInstanceOf(LangchainProvider);
  });
});
