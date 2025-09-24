import { Test, TestingModule } from '@nestjs/testing';
import { LangchainProvider } from './langchain.provider';
import { ConfigService } from '@nestjs/config';
import { initChatModel } from 'langchain';

// Mock LangChain
jest.mock('langchain', () => ({
  initChatModel: jest.fn(),
  SystemMessage: jest
    .fn()
    .mockImplementation((content) => ({ content, _getType: () => 'system' })),
  HumanMessage: jest
    .fn()
    .mockImplementation((content) => ({ content, _getType: () => 'human' })),
  AIMessage: jest
    .fn()
    .mockImplementation((content) => ({ content, _getType: () => 'ai' })),
  ToolMessage: jest.fn().mockImplementation((content, tool_call_id) => ({
    content,
    tool_call_id,
    _getType: () => 'tool',
  })),
}));

describe('LangchainProvider', () => {
  let provider: LangchainProvider;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'LLM_PROVIDER') return 'mistral';
      if (key === 'LLM_MODEL') return 'mistral-small-latest';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LangchainProvider,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    provider = module.get<LangchainProvider>(LangchainProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInfo', () => {
    it('should return provider info', () => {
      const info = provider.getInfo();
      expect(info).toEqual({
        provider: 'mistral',
        model: 'mistral-small-latest',
      });
    });
  });

  describe('complete', () => {
    it('should call completeWithStructuredOutput with undefined schema', async () => {
      const mockResult = { content: 'test response' };
      const spy = jest
        .spyOn(provider, 'completeWithStructuredOutput')
        .mockResolvedValue(mockResult);

      const messages = [{ role: 'user' as const, content: 'test' }];
      const tools = [{ name: 'test-tool' }];

      const result = await provider.complete(messages, tools);

      expect(spy).toHaveBeenCalledWith(messages, tools, null);
      expect(result).toBe(mockResult);
    });
  });

  describe('completeWithStructuredOutput', () => {
    it('should process messages and return structured output', async () => {
      const mockModel = {
        bindTools: jest.fn().mockReturnThis(),
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest
            .fn()
            .mockResolvedValue({ tasks: [{ title: 'Test task' }] }),
        }),
      };

      (initChatModel as jest.Mock).mockResolvedValue(mockModel);

      const messages = [{ role: 'user' as const, content: 'test' }];
      const tools = [{ name: 'test-tool' }];
      const schema = { type: 'object' };

      const result = await provider.completeWithStructuredOutput(
        messages,
        tools,
        schema,
      );

      expect(initChatModel).toHaveBeenCalledWith(
        'mistralai:mistral-small-latest',
      );
      expect(mockModel.bindTools).toHaveBeenCalledWith(tools);
      expect(mockModel.withStructuredOutput).toHaveBeenCalledWith(schema);
      expect(result).toEqual({ tasks: [{ title: 'Test task' }] });
    });

    it('should handle fallback to regular completion when schema is not provided', async () => {
      const mockModel = {
        bindTools: jest.fn().mockReturnThis(),
        invoke: jest.fn().mockResolvedValue({ content: 'test response' }),
      };

      (initChatModel as jest.Mock).mockResolvedValue(mockModel);

      const messages = [{ role: 'user' as const, content: 'test' }];
      const tools = [{ name: 'test-tool' }];

      const result = await provider.completeWithStructuredOutput(
        messages,
        tools,
        undefined,
      );

      expect(initChatModel).toHaveBeenCalledWith(
        'mistralai:mistral-small-latest',
      );
      expect(mockModel.bindTools).toHaveBeenCalledWith(tools);
      expect(mockModel.invoke).toHaveBeenCalled();
      expect(result).toBe('test response');
    });

    it('should handle errors gracefully', async () => {
      (initChatModel as jest.Mock).mockRejectedValue(
        new Error('LangChain error'),
      );

      const messages = [{ role: 'user' as const, content: 'test' }];
      const tools = [{ name: 'test-tool' }];
      const schema = { type: 'object' };

      await expect(
        provider.completeWithStructuredOutput(messages, tools, schema),
      ).rejects.toThrow('LangChain error');
    });
  });

  describe('getLastUsageMetadata', () => {
    it('should return the last captured usage metadata', async () => {
      const mockModel = {
        bindTools: jest.fn().mockReturnThis(),
        withStructuredOutput: jest.fn().mockReturnValue({
          invoke: jest.fn().mockResolvedValue({ tasks: [] }),
        }),
      };

      (initChatModel as jest.Mock).mockResolvedValue(mockModel);

      const messages = [{ role: 'user' as const, content: 'test' }];
      const tools = [{ name: 'test-tool' }];
      const schema = { type: 'object' };

      await provider.completeWithStructuredOutput(messages, tools, schema);

      const metadata = provider.getLastUsageMetadata();
      expect(metadata).toEqual({
        total_tokens: 200,
        input_tokens: 120,
        output_tokens: 80,
        provider: 'mistral',
        model: 'mistral-small-latest',
      });
    });

    it('should return null when no metadata has been captured', () => {
      const metadata = provider.getLastUsageMetadata();
      expect(metadata).toBeNull();
    });
  });
});
