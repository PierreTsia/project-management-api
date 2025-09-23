import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiMetricsService } from './ai.metrics.service';
import { LlmProviderService } from './llm-provider.service';
import { ContextService } from './context/context.service';
import type { ContextRequestDto } from './dto/context-request.dto';
import {
  ProjectHealthRequestDto,
  ProjectHealthResponseDto,
  GenerateTasksRequestDto,
  GenerateTasksResponseDto,
} from './types';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly metrics: AiMetricsService,
    private readonly llmProvider: LlmProviderService,
    private readonly contextService: ContextService,
  ) {}

  @Post('hello')
  async postHello(
    @Body() body: { name?: string },
  ): Promise<{ provider: string; model: string; message: string }> {
    const start = Date.now();
    const { provider, model } = this.llmProvider.getInfo();
    this.metrics.recordRequest('/ai/hello', { provider, model });
    try {
      const result = await this.aiService.getHello(body?.name);
      this.metrics.recordLatency('/ai/hello', Date.now() - start, {
        provider,
        model,
      });
      return result;
    } catch (e: any) {
      this.metrics.recordError('/ai/hello', e?.code || 'UNKNOWN', {
        provider,
        model,
      });
      throw e;
    }
  }

  @Post('project-health')
  async checkProjectHealth(
    @Body() body: ProjectHealthRequestDto,
  ): Promise<ProjectHealthResponseDto> {
    const start = Date.now();
    const { provider, model } = this.llmProvider.getInfo();
    this.metrics.recordRequest('/ai/project-health', { provider, model });
    try {
      const result = await this.aiService.checkProjectHealth(body);
      this.metrics.recordLatency('/ai/project-health', Date.now() - start, {
        provider,
        model,
      });
      return result;
    } catch (e: any) {
      this.metrics.recordError('/ai/project-health', e?.code || 'UNKNOWN', {
        provider,
        model,
      });
      throw e;
    }
  }

  @Post('generate-tasks')
  async generateTasks(
    @Body() body: GenerateTasksRequestDto,
  ): Promise<GenerateTasksResponseDto> {
    const start = Date.now();
    const { provider, model } = this.llmProvider.getInfo();
    this.metrics.recordRequest('/ai/generate-tasks', { provider, model });
    try {
      const result = await this.aiService.generateTasks(body);
      this.metrics.recordLatency('/ai/generate-tasks', Date.now() - start, {
        provider,
        model,
      });
      return result;
    } catch (e: any) {
      this.metrics.recordError('/ai/generate-tasks', e?.code || 'UNKNOWN', {
        provider,
        model,
      });
      throw e;
    }
  }

  @Post('context')
  async getContext(
    @Body() body: ContextRequestDto,
    @Req() req: any,
  ): Promise<
    | import('./context/models/aggregated-context.model').ProjectAggregatedContext
    | undefined
  > {
    const start = Date.now();
    const { provider, model } = this.llmProvider.getInfo();
    this.metrics.recordRequest('/ai/context', { provider, model });
    try {
      const userId = req?.user?.sub || req?.user?.userId || req?.user?.id || '';
      const result = await this.contextService.getAggregatedContext(
        body.projectId,
        userId,
      );
      this.metrics.recordLatency('/ai/context', Date.now() - start, {
        provider,
        model,
      });
      return result;
    } catch (e: any) {
      this.metrics.recordError('/ai/context', e?.code || 'UNKNOWN', {
        provider,
        model,
      });
      throw e;
    }
  }
}
