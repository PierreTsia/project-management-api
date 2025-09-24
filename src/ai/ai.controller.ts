import {
  Body,
  Controller,
  Post,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiMetricsService } from './ai.metrics.service';
import { LlmProviderService } from './llm-provider.service';
import { ContextService } from './context/context.service';
import { AiRedactionService } from './ai.redaction.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { ContextRequestDto } from './dto/context-request.dto';
import { ProjectHealthRequestDto, ProjectHealthResponseDto } from './types';
import {
  GenerateTasksRequestDto,
  GenerateTasksResponseDto,
} from './dto/generate-tasks.dto';

@Controller('ai')
@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly metrics: AiMetricsService,
    private readonly llmProvider: LlmProviderService,
    private readonly contextService: ContextService,
    private readonly redaction: AiRedactionService,
  ) {}

  @Post('hello')
  @ApiOperation({
    summary: 'AI Hello endpoint',
    description:
      'Simple AI endpoint for testing LLM connectivity and basic functionality',
  })
  @ApiBody({
    description: 'Optional name parameter',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'World' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'AI response generated successfully',
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', example: 'mistral' },
        model: { type: 'string', example: 'mistral-small-latest' },
        message: {
          type: 'string',
          example: 'Hello World! How can I help you today?',
        },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Generate AI-powered task suggestions',
    description:
      'Uses LLM to generate 3-12 actionable tasks based on user intent and optional project context. Tasks are generated without IDs and can be used as suggestions for project planning.',
  })
  @ApiBody({
    type: GenerateTasksRequestDto,
    description:
      'Task generation request with user intent and optional project context',
    examples: {
      'basic-prompt': {
        summary: 'Basic task generation',
        value: {
          prompt: 'Create a user authentication system',
          locale: 'en',
        },
      },
      'with-project-context': {
        summary: 'With project context',
        value: {
          prompt: 'Add dark mode toggle to settings page',
          projectId: '71063ace-7803-43d3-a95b-9d26ef1c129b',
          locale: 'en',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks generated successfully',
    type: GenerateTasksResponseDto,
    examples: {
      'success-response': {
        summary: 'Successful task generation',
        value: {
          tasks: [
            {
              title: 'Design authentication UI components',
              description:
                'Create login and registration forms with validation',
              priority: 'HIGH',
            },
            {
              title: 'Implement JWT token management',
              description: 'Set up secure token generation and validation',
              priority: 'HIGH',
            },
            {
              title: 'Add password reset functionality',
              description: 'Create password reset flow with email verification',
              priority: 'MEDIUM',
            },
          ],
          meta: {
            model: 'mistral-small-latest',
            provider: 'mistral',
            degraded: false,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request - missing prompt or invalid project ID',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Prompt is required' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 503,
    description:
      'AI service unavailable - AI_TOOLS_ENABLED=false or provider error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 503 },
        message: {
          type: 'string',
          example: 'AI service is currently unavailable',
        },
        error: { type: 'string', example: 'Service Unavailable' },
      },
    },
  })
  async generateTasks(
    @Body() body: GenerateTasksRequestDto,
    @CurrentUser() user: User,
  ): Promise<GenerateTasksResponseDto> {
    const start = Date.now();
    const { provider, model } = this.llmProvider.getInfo();
    this.metrics.recordRequest('/ai/generate-tasks', { provider, model });
    try {
      if (body.projectId && !user?.id) {
        throw new BadRequestException({
          status: 400,
          code: 'AI.USER_ID_REQUIRED',
          message: 'Authenticated user is required when projectId is provided',
        });
      }
      const result = await this.aiService.generateTasks(body, user.id);
      this.metrics.recordLatency('/ai/generate-tasks', Date.now() - start, {
        provider,
        model,
      });
      return result;
    } catch (e) {
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
