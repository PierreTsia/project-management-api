import {
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderFactory } from './provider.factory';

@Injectable()
export class AiBootstrapService implements OnModuleInit {
  constructor(
    private readonly config: ConfigService,
    private readonly factory: ProviderFactory,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabled =
      this.config.get<string>('AI_TOOLS_ENABLED', 'false') === 'true';
    if (!enabled) {
      return;
    }
    const apiKey = this.config.get<string>('LLM_API_KEY', '');
    if (!apiKey) {
      throw new ServiceUnavailableException({
        code: 'AI_DISABLED_MISSING_API_KEY',
      });
    }
    try {
      const info = this.factory.get().getInfo();
      if (!info?.provider || !info?.model) {
        throw new Error('Invalid provider info');
      }
    } catch (err) {
      throw new ServiceUnavailableException({ code: 'AI_BOOTSTRAP_FAILED' });
    }
  }
}
