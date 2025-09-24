import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { LlmProviderService } from '../llm-provider.service';
import type { AiProviderInfo } from '../provider.types';
import type { LangchainMessage } from './message.mapper';

export type ChatModel = {
  generate(
    messages: ReadonlyArray<LangchainMessage>,
    tools?: any[],
  ): Promise<string>;
  generateWithStructuredOutput<T>(
    messages: ReadonlyArray<LangchainMessage>,
    tools: any[] | undefined,
    schema: any,
  ): Promise<T>;
  withStructuredOutput(schema: any): ChatModel;
  invoke(messages: ReadonlyArray<LangchainMessage>): Promise<any>;
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
    async generateWithStructuredOutput<T>(
      messages: ReadonlyArray<LangchainMessage>,
      tools: any[] | undefined,
      schema: any,
    ): Promise<T> {
      const providerMessages = messages.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.content,
      })) as ChatCompletionMessageParam[];
      return llmProvider.callLLMWithStructuredOutput(
        [...providerMessages],
        tools,
        schema,
      );
    },
    withStructuredOutput(schema: any): ChatModel {
      // Return a new ChatModel instance with structured output capability
      return {
        ...this,
        async invoke(messages: ReadonlyArray<LangchainMessage>): Promise<any> {
          const providerMessages = messages.map((m) => ({
            role: m.role === 'ai' ? 'assistant' : m.role,
            content: m.content,
          })) as ChatCompletionMessageParam[];
          return llmProvider.callLLMWithStructuredOutput(
            [...providerMessages],
            undefined,
            schema,
          );
        },
      };
    },
    async invoke(messages: ReadonlyArray<LangchainMessage>): Promise<any> {
      const providerMessages = messages.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.content,
      })) as ChatCompletionMessageParam[];
      return llmProvider.callLLM([...providerMessages]);
    },
    getInfo(): AiProviderInfo {
      return llmProvider.getInfo();
    },
  };
}
