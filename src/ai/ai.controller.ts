import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('hello')
  async postHello(
    @Body() body: { name?: string },
  ): Promise<{ provider: string; model: string; message: string }> {
    return this.aiService.getHello(body?.name);
  }
}
