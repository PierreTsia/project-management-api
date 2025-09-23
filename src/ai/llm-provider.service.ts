import { Injectable } from '@nestjs/common';

export interface ProviderInfo {
  provider: string;
  model: string;
}

@Injectable()
export class LlmProviderService {
  getProviderInfo(): ProviderInfo {
    const provider = process.env.LLM_PROVIDER || 'mistral';
    const model = process.env.LLM_MODEL || 'mistral-small-latest';
    return { provider, model };
  }
}
