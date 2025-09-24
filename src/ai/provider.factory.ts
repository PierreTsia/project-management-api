import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MistralProvider } from './providers/mistral.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { LangchainProvider } from './providers/langchain.provider';
import { AiProvider } from './provider.types';

@Injectable()
export class ProviderFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly mistral: MistralProvider,
    private readonly openai: OpenAiProvider,
    private readonly langchain: LangchainProvider,
  ) {}

  get(): AiProvider {
    return this.langchain;
  }
}
