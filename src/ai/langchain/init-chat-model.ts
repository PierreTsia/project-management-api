import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { LlmProviderService } from '../llm-provider.service';
import type { AiProviderInfo } from '../provider.types';
import type { LangchainMessage } from './message.mapper';

export type ChatModel = {
  generate(
    messages: ReadonlyArray<LangchainMessage>,
    tools?: any[],
  ): Promise<string>;
  getInfo(): AiProviderInfo;
};

export function initChatModel(llmProvider: LlmProviderService): ChatModel {
  return {
    async generate(
      messages: ReadonlyArray<LangchainMessage>,
      tools?: any[],
    ): Promise<string> {
      const providerMessages = messages.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.content,
      })) as ChatCompletionMessageParam[];
      return llmProvider.callLLM([...providerMessages], tools);
    },
    getInfo(): AiProviderInfo {
      return llmProvider.getInfo();
    },
  };
}
