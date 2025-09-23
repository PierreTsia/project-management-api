import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiMetricsService } from './ai.metrics.service';
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
  ) {}

  @Post('hello')
  async postHello(
    @Body() body: { name?: string },
  ): Promise<{ provider: string; model: string; message: string }> {
    const start = Date.now();
    this.metrics.recordRequest('/ai/hello');
    try {
      const result = await this.aiService.getHello(body?.name);
      this.metrics.recordLatency('/ai/hello', Date.now() - start);
      return result;
    } catch (e: any) {
      this.metrics.recordError('/ai/hello', e?.code || 'UNKNOWN');
      throw e;
    }
  }

  @Post('project-health')
  async checkProjectHealth(
    @Body() body: ProjectHealthRequestDto,
  ): Promise<ProjectHealthResponseDto> {
    const start = Date.now();
    this.metrics.recordRequest('/ai/project-health');
    try {
      const result = await this.aiService.checkProjectHealth(body);
      this.metrics.recordLatency('/ai/project-health', Date.now() - start);
      return result;
    } catch (e: any) {
      this.metrics.recordError('/ai/project-health', e?.code || 'UNKNOWN');
      throw e;
    }
  }

  @Post('generate-tasks')
  async generateTasks(
    @Body() body: GenerateTasksRequestDto,
  ): Promise<GenerateTasksResponseDto> {
    const start = Date.now();
    this.metrics.recordRequest('/ai/generate-tasks');
    try {
      const result = await this.aiService.generateTasks(body);
      this.metrics.recordLatency('/ai/generate-tasks', Date.now() - start);
      return result;
    } catch (e: any) {
      this.metrics.recordError('/ai/generate-tasks', e?.code || 'UNKNOWN');
      throw e;
    }
  }
}
