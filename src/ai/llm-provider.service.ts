import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import {
  AiProvider,
  AiProviderInfo,
  AiProviderTimeoutError,
  AiProviderAuthError,
  AiProviderBadRequestError,
} from './provider.types';

@Injectable()
export class LlmProviderService implements AiProvider {
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    const provider = this.configService.get<string>('LLM_PROVIDER', 'mistral');
    const apiKey = this.configService.get<string>('LLM_API_KEY', '');

    if (!apiKey) {
      throw new Error('LLM_API_KEY is required');
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: provider === 'mistral' ? 'https://api.mistral.ai/v1' : undefined,
    });
  }

  getInfo(): AiProviderInfo {
    return {
      provider: this.configService.get<string>('LLM_PROVIDER', 'mistral'),
      model: this.configService.get<string>(
        'LLM_MODEL',
        'mistral-small-latest',
      ),
    };
  }

  async callLLM(messages: ChatCompletionMessageParam[]): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.configService.get<string>(
          'LLM_MODEL',
          'mistral-small-latest',
        ),
        messages: [...messages],
        max_tokens: this.configService.get<number>('LLM_MAX_TOKENS', 2000),
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      if (error.code === 'timeout' || error.message?.includes('timeout')) {
        throw new AiProviderTimeoutError('LLM request timed out');
      }
      if (error.status === 401) {
        throw new AiProviderAuthError('Invalid API key');
      }
      if (error.status === 400) {
        throw new AiProviderBadRequestError('Invalid request');
      }
      throw error;
    }
  }
}
