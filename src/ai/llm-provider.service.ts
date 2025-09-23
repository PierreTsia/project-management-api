import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AiProviderInfo } from './provider.types';
import { ProviderFactory } from './provider.factory';

@Injectable()
export class LlmProviderService {
  constructor(
    private readonly configService: ConfigService,
    private readonly factory: ProviderFactory,
  ) {}

  getInfo(): AiProviderInfo {
    return this.factory.get().getInfo();
  }

  async callLLM(messages: ChatCompletionMessageParam[]): Promise<string> {
    return this.factory.get().complete(messages);
  }
}
