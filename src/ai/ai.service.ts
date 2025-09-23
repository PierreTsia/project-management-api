import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LlmProviderService } from '../ai/llm-provider.service';

@Injectable()
export class AiService {
  constructor(private readonly llmProvider: LlmProviderService) {}

  async getHello(
    name?: string,
  ): Promise<{ provider: string; model: string; message: string }> {
    if (process.env.AI_TOOLS_ENABLED !== 'true') {
      throw new ServiceUnavailableException({ code: 'AI_DISABLED' });
    }
    const { provider, model } = this.llmProvider.getProviderInfo();
    const safeName = name?.toString().slice(0, 64);
    const message = safeName ? `hello ${safeName}` : 'hello';
    return { provider, model, message };
  }
}
