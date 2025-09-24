import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from 'langchain';

/**
 * Type guard to check if a part is a text part with a 'text' property
 */
const isTextPart = (part: unknown): part is { text: string } => {
  return (
    typeof part === 'object' &&
    part !== null &&
    'text' in part &&
    typeof (part as { text: unknown }).text === 'string'
  );
};

/**
 * Extracts text content from a ChatCompletionMessageParam, handling various content formats
 * that different AI providers may return.
 *
 * @param message - The message parameter from AI providers
 * @returns The extracted text content as a string
 *
 * @example
 * ```typescript
 * // Simple string content
 * getMessageContent({ role: 'user', content: 'Hello' })
 * // → "Hello"
 *
 * // Array of text objects
 * getMessageContent({
 *   role: 'assistant',
 *   content: [{ text: 'Hello' }, { text: 'world' }]
 * })
 * // → "Hello\nworld"
 *
 * // Mixed array content
 * getMessageContent({
 *   role: 'assistant',
 *   content: ['Hello', { text: 'world' }]
 * })
 * // → "Hello\nworld"
 * ```
 */
export const getMessageContent = (
  message: ChatCompletionMessageParam,
): string => {
  const candidate = message.content;
  if (typeof candidate === 'string') return candidate;
  if (Array.isArray(candidate)) {
    return candidate
      .map((part: unknown) => {
        if (typeof part === 'string') return part;
        if (isTextPart(part)) {
          return part.text;
        }
        return '';
      })
      .filter((s) => s.length > 0)
      .join('\n');
  }
  return '';
};

/**
 * Normalizes output content from various AI provider response formats into a string.
 * Handles nested content objects and arrays gracefully.
 *
 * @param value - The value to normalize (can be string, array, or object)
 * @returns The normalized string content
 *
 * @example
 * ```typescript
 * normalizeOutputContent("Hello world")
 * // → "Hello world"
 *
 * normalizeOutputContent(["Hello", "world"])
 * // → "Hello\nworld"
 *
 * normalizeOutputContent({ content: "Hello world" })
 * // → "Hello world"
 * ```
 */
export const normalizeOutputContent = (value: unknown): string => {
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

/**
 * Converts ChatCompletionMessageParam array to LangChain message classes.
 *
 * @param messages - Array of messages from AI providers
 * @returns Array of LangChain message instances
 *
 * @example
 * ```typescript
 * const messages = [
 *   { role: 'system', content: 'You are a helpful assistant' },
 *   { role: 'user', content: 'Hello' },
 *   { role: 'assistant', content: 'Hi there!' }
 * ];
 *
 * const lcMessages = convertToLangChainMessages(messages);
 * // → [SystemMessage, HumanMessage, AIMessage]
 * ```
 */
export const convertToLangChainMessages = (
  messages: ChatCompletionMessageParam[],
) => {
  return messages.map((m) => {
    const text = getMessageContent(m);
    if (m.role === 'system') return new SystemMessage(text);
    if (m.role === 'assistant') return new AIMessage(text);
    if (m.role === 'tool') {
      return new ToolMessage(text, m.tool_call_id);
    }
    return new HumanMessage(text);
  });
};
