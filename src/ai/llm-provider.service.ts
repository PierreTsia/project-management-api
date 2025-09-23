import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AiProviderInfo } from './provider.types';
import { ProviderFactory } from './provider.factory';
import { AiTracingService } from './ai.tracing.service';

@Injectable()
export class LlmProviderService {
  constructor(
    private readonly configService: ConfigService,
    private readonly factory: ProviderFactory,
    private readonly tracing: AiTracingService,
  ) {}

  getInfo(): AiProviderInfo {
    return this.factory.get().getInfo();
  }

  async callLLM(messages: ChatCompletionMessageParam[]): Promise<string> {
    return this.tracing.withSpan('llm.call', async () => {
      return this.factory.get().complete(messages);
    });
  }
}
