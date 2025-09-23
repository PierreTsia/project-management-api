import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from '../ai/ai.service';
import { LlmProviderService } from '../ai/llm-provider.service';
import { AiMetricsService } from './ai.metrics.service';

@Module({
  imports: [],
  controllers: [AiController],
  providers: [AiService, LlmProviderService, AiMetricsService],
})
export class AiModule {}
