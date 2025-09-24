import {
  getMessageContent,
  normalizeOutputContent,
  convertToLangChainMessages,
} from './message.utils';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from 'langchain';

describe('getMessageContent', () => {
  it('should extract simple string content', () => {
    const message: ChatCompletionMessageParam = {
      role: 'user',
      content: 'Hello world',
    };

    const result = getMessageContent(message);
    expect(result).toBe('Hello world');
  });

  it('should extract content from array of text parts', () => {
    const message: ChatCompletionMessageParam = {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'world' },
        { type: 'text', text: 'test' },
      ],
    };

    const result = getMessageContent(message);
    expect(result).toBe('Hello\nworld\ntest');
  });

  it('should filter out empty strings', () => {
    const message: ChatCompletionMessageParam = {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: '' },
        { type: 'text', text: 'world' },
        { type: 'text', text: '' },
        { type: 'text', text: 'test' },
      ],
    };

    const result = getMessageContent(message);
    expect(result).toBe('Hello\nworld\ntest');
  });

  it('should handle empty array', () => {
    const message: ChatCompletionMessageParam = {
      role: 'assistant',
      content: [],
    };

    const result = getMessageContent(message);
    expect(result).toBe('');
  });

  it('should handle undefined content', () => {
    const message: ChatCompletionMessageParam = {
      role: 'assistant',
      content: undefined,
    };

    const result = getMessageContent(message);
    expect(result).toBe('');
  });

  it('should handle unknown content types gracefully', () => {
    const message: ChatCompletionMessageParam = {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'world' },
      ],
    };

    const result = getMessageContent(message);
    expect(result).toBe('Hello\nworld');
  });
});

describe('normalizeOutputContent', () => {
  it('should return string content as-is', () => {
    const result = normalizeOutputContent('Hello world');
    expect(result).toBe('Hello world');
  });

  it('should join array of strings with newlines', () => {
    const result = normalizeOutputContent(['Hello', 'world', 'test']);
    expect(result).toBe('Hello\nworld\ntest');
  });

  it('should filter out non-string elements in arrays', () => {
    const result = normalizeOutputContent([
      'Hello',
      123,
      'world',
      null,
      'test',
    ]);
    expect(result).toBe('Hello\nworld\ntest');
  });

  it('should handle nested content objects', () => {
    const result = normalizeOutputContent({ content: 'Hello world' });
    expect(result).toBe('Hello world');
  });

  it('should handle deeply nested content objects', () => {
    const result = normalizeOutputContent({
      content: {
        content: 'Hello world',
      },
    });
    expect(result).toBe('Hello world');
  });

  it('should return empty string for unknown types', () => {
    const result = normalizeOutputContent(123);
    expect(result).toBe('');
  });

  it('should return empty string for null/undefined', () => {
    expect(normalizeOutputContent(null)).toBe('');
    expect(normalizeOutputContent(undefined)).toBe('');
  });
});

describe('convertToLangChainMessages', () => {
  it('should convert system message', () => {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are a helpful assistant' },
    ];

    const result = convertToLangChainMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(SystemMessage);
    expect(result[0].content).toBe('You are a helpful assistant');
  });

  it('should convert user message', () => {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'user', content: 'Hello' },
    ];

    const result = convertToLangChainMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(HumanMessage);
    expect(result[0].content).toBe('Hello');
  });

  it('should convert assistant message', () => {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'assistant', content: 'Hi there!' },
    ];

    const result = convertToLangChainMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(AIMessage);
    expect(result[0].content).toBe('Hi there!');
  });

  it('should convert tool message', () => {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'tool',
        content: 'Tool result',
        tool_call_id: 'call_123',
      },
    ];

    const result = convertToLangChainMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(ToolMessage);
    expect(result[0].content).toBe('Tool result');
    expect((result[0] as ToolMessage).tool_call_id).toBe('call_123');
  });

  it('should convert mixed message types', () => {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
      { role: 'tool', content: 'Result', tool_call_id: 'call_123' },
    ];

    const result = convertToLangChainMessages(messages);

    expect(result).toHaveLength(4);
    expect(result[0]).toBeInstanceOf(SystemMessage);
    expect(result[1]).toBeInstanceOf(HumanMessage);
    expect(result[2]).toBeInstanceOf(AIMessage);
    expect(result[3]).toBeInstanceOf(ToolMessage);
  });

  it('should handle complex content formats', () => {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: 'world' },
        ],
      },
    ];

    const result = convertToLangChainMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(AIMessage);
    expect(result[0].content).toBe('Hello\nworld');
  });
});
