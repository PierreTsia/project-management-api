import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from '../ai/ai.service';
import { LlmProviderService } from '../ai/llm-provider.service';
import { AiMetricsService } from './ai.metrics.service';
import { ProviderFactory } from './provider.factory';
import { MistralProvider } from './providers/mistral.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { AiBootstrapService } from './ai.bootstrap.service';
import { AiRedactionService } from './ai.redaction.service';
import { AiTracingService } from './ai.tracing.service';

@Module({
  imports: [],
  controllers: [AiController],
  providers: [
    AiService,
    LlmProviderService,
    AiMetricsService,
    AiRedactionService,
    AiTracingService,
    ProviderFactory,
    MistralProvider,
    OpenAiProvider,
    AiBootstrapService,
  ],
})
export class AiModule {}
