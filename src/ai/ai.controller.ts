import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiMetricsService } from './ai.metrics.service';

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
}
