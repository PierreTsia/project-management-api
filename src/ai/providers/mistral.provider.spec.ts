import { ConfigService } from '@nestjs/config';
import { MistralProvider } from './mistral.provider';
import {
  AiProviderAuthError,
  AiProviderBadRequestError,
  AiProviderTimeoutError,
} from '../provider.types';

jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

describe('MistralProvider error mapping', () => {
  const makeProvider = (
    overrides?: Record<string, unknown>,
  ): MistralProvider => {
    const config = new ConfigService({
      LLM_API_KEY: 'key',
      LLM_MODEL: 'mistral-small-latest',
      LLM_MAX_TOKENS: 2000,
      ...overrides,
    } as Record<string, unknown>);
    return new MistralProvider(config);
  };

  const getOpenAiInstance = (): any => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mockCtor = (require('openai').default as jest.Mock).mock;
    const results = mockCtor.results as Array<{ value: any }>;
    return results[results.length - 1]?.value;
  };

  it('maps timeout to AiProviderTimeoutError', async () => {
    const provider = makeProvider();
    const openAiInstance: any = getOpenAiInstance();
    openAiInstance.chat.completions.create.mockRejectedValueOnce(
      Object.assign(new Error('timeout'), { code: 'timeout' }),
    );
    await expect(provider.complete([])).rejects.toBeInstanceOf(
      AiProviderTimeoutError,
    );
  });

  it('maps 401 to AiProviderAuthError', async () => {
    const provider = makeProvider();
    const openAiInstance: any = getOpenAiInstance();
    openAiInstance.chat.completions.create.mockRejectedValueOnce({
      status: 401,
    });
    await expect(provider.complete([])).rejects.toBeInstanceOf(
      AiProviderAuthError,
    );
  });

  it('maps 400 to AiProviderBadRequestError', async () => {
    const provider = makeProvider();
    const openAiInstance: any = getOpenAiInstance();
    openAiInstance.chat.completions.create.mockRejectedValueOnce({
      status: 400,
    });
    await expect(provider.complete([])).rejects.toBeInstanceOf(
      AiProviderBadRequestError,
    );
  });
});
