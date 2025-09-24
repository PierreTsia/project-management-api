import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import {
  AiProvider,
  AiProviderAuthError,
  AiProviderBadRequestError,
  AiProviderInfo,
  AiProviderTimeoutError,
} from '../provider.types';

@Injectable()
export class OpenAiProvider implements AiProvider {
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('LLM_API_KEY', '');
    if (!apiKey) {
      throw new Error('LLM_API_KEY is required');
    }
    this.client = new OpenAI({ apiKey });
  }

  getInfo(): AiProviderInfo {
    return {
      provider: 'openai',
      model: this.config.get<string>('LLM_MODEL', 'gpt-4o-mini'),
    };
  }

  async complete(
    messages: ChatCompletionMessageParam[],
    tools?: any[],
  ): Promise<string> {
    return this.completeWithStructuredOutput(messages, tools, null);
  }

  async completeWithStructuredOutput<T>(
    messages: ChatCompletionMessageParam[],
    tools: any[] | undefined,
    schema: any,
  ): Promise<T> {
    try {
      const res = await this.client.chat.completions.create({
        model: this.config.get<string>('LLM_MODEL', 'gpt-4o-mini'),
        messages: [...messages],
        max_tokens: this.config.get<number>('LLM_MAX_TOKENS', 2000),
        temperature: 0.3,
      });
      const content = res.choices[0]?.message?.content || '';

      // If schema is provided, parse with structured output
      if (schema) {
        // For now, fallback to JSON parsing since OpenAI doesn't support structured output directly
        const parsed = JSON.parse(content);
        const validated = schema.parse(parsed);
        return validated as T;
      }

      return content as T;
    } catch (error: any) {
      if (error?.code === 'timeout' || error?.message?.includes('timeout')) {
        throw new AiProviderTimeoutError('LLM request timed out');
      }
      if (error?.status === 401) {
        throw new AiProviderAuthError('Invalid API key');
      }
      if (error?.status === 400) {
        throw new AiProviderBadRequestError('Invalid request');
      }
      throw error;
    }
  }
}
