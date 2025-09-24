import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import {
  initChatModel,
  HumanMessage,
  SystemMessage,
  AIMessage,
  ToolMessage,
} from 'langchain';
import {
  AiProvider,
  AiProviderInfo,
  AiProviderAuthError,
  AiProviderBadRequestError,
  AiProviderTimeoutError,
} from '../provider.types';

@Injectable()
export class LangchainProvider implements AiProvider {
  constructor(private readonly config: ConfigService) {}

  getInfo(): AiProviderInfo {
    const provider = this.config.get<string>('LLM_PROVIDER', 'mistral');
    const model = this.config.get<string>('LLM_MODEL', 'mistral-small-latest');
    return { provider, model } as const;
  }

  private ensureSdkEnv(provider: string): void {
    const apiKey = this.config.get<string>('LLM_API_KEY', '');
    if (provider === 'openai') {
      if (!process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = apiKey;
    } else {
      if (!process.env.MISTRAL_API_KEY) process.env.MISTRAL_API_KEY = apiKey;
    }
  }

  async complete(
    messages: ChatCompletionMessageParam[],
    tools?: any[],
  ): Promise<string> {
    const { provider, model } = this.getInfo();
    this.ensureSdkEnv(provider);

    const modelId =
      provider === 'openai' ? `openai:${model}` : `mistralai:${model}`;

    const getMessageContent = (message: ChatCompletionMessageParam): string => {
      const candidate = (message as { content?: unknown }).content;
      if (typeof candidate === 'string') return candidate;
      if (Array.isArray(candidate)) {
        return candidate
          .map((part: unknown) => {
            if (typeof part === 'string') return part;
            if (
              typeof part === 'object' &&
              part !== null &&
              'text' in (part as Record<string, unknown>) &&
              typeof (part as Record<string, unknown>).text === 'string'
            ) {
              return (part as { text: string }).text;
            }
            return '';
          })
          .filter((s) => s.length > 0)
          .join('\n');
      }
      return '';
    };

    const normalizeOutputContent = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) {
        return value
          .map((v) => (typeof v === 'string' ? v : ''))
          .filter((s) => s.length > 0)
          .join('\n');
      }
      if (typeof value === 'object' && value !== null) {
        if ('content' in (value as Record<string, unknown>)) {
          const inner = (value as { content?: unknown }).content;
          return normalizeOutputContent(inner);
        }
      }
      return '';
    };

    try {
      const chatModel = await initChatModel(modelId);
      const lcMessages = messages.map((m) => {
        const text = getMessageContent(m);
        if (m.role === 'system') return new SystemMessage(text);
        if (m.role === 'assistant') return new AIMessage(text);
        if (m.role === 'tool')
          return new ToolMessage(text, (m as any).tool_call_id);
        return new HumanMessage(text);
      });

      // Bind tools if provided
      const modelWithTools = tools ? chatModel.bindTools(tools) : chatModel;
      const result = await modelWithTools.invoke(lcMessages);
      return normalizeOutputContent(result?.content);
    } catch (error: any) {
      const message: string = error?.message || '';
      if (message.includes('timeout')) {
        throw new AiProviderTimeoutError('LLM request timed out');
      }
      if (message.includes('unauthorized') || message.includes('401')) {
        throw new AiProviderAuthError('Invalid API key');
      }
      if (message.includes('400')) {
        throw new AiProviderBadRequestError('Invalid request');
      }
      throw error;
    }
  }
}
