import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MistralProvider } from './providers/mistral.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { AiProvider } from './provider.types';

@Injectable()
export class ProviderFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly mistral: MistralProvider,
    private readonly openai: OpenAiProvider,
  ) {}

  get(): AiProvider {
    const provider = this.config.get<string>('LLM_PROVIDER', 'mistral');
    return provider === 'openai' ? this.openai : this.mistral;
  }
}
