import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
export interface AiProviderInfo {
  provider: string;
  model: string;
}

export interface AiProvider {
  getInfo(): AiProviderInfo;
  complete(messages: ChatCompletionMessageParam[]): Promise<string>;
}

export class AiProviderTimeoutError extends Error {
  public readonly code: string = 'AI_PROVIDER_TIMEOUT';
}

export class AiProviderAuthError extends Error {
  public readonly code: string = 'AI_PROVIDER_AUTH';
}

export class AiProviderBadRequestError extends Error {
  public readonly code: string = 'AI_PROVIDER_BAD_REQUEST';
}
