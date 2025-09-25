import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LlmProviderService } from '../ai/llm-provider.service';
import { TaskGeneratorTool } from './tools/task-generator.tool';
import { TaskRelationshipGeneratorTool } from './tools/task-relationship-generator.tool';
import {
  ConfirmLinkedTasksDto,
  GenerateLinkedTasksPreviewDto,
  GenerateLinkedTasksRequestDto,
  GenerateLinkedTasksResponseDto,
} from './dto/linked-tasks.dto';
import { ProjectHealthRequestDto, ProjectHealthResponseDto } from './types';
import {
  GenerateTasksRequestDto,
  GenerateTasksResponseDto,
} from './dto/generate-tasks.dto';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

@Injectable()
export class AiService {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly taskGeneratorTool: TaskGeneratorTool,
    private readonly taskRelationshipGeneratorTool: TaskRelationshipGeneratorTool,
  ) {}

  async getHello(
    name?: string,
  ): Promise<{ provider: string; model: string; message: string }> {
    if (process.env.AI_TOOLS_ENABLED !== 'true') {
      throw new ServiceUnavailableException({ code: 'AI_DISABLED' });
    }
    const { provider, model } = this.llmProvider.getInfo();
    const safeName = (name ?? 'friend').toString().slice(0, 64);
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user' as const,
        content: `Greet ${safeName}.`,
      },
    ];
    await this.llmProvider.callLLM(messages);
    const message = `hello ${safeName}`;
    return { provider, model, message };
  }

  async checkProjectHealth(
    request: ProjectHealthRequestDto,
  ): Promise<ProjectHealthResponseDto> {
    if (process.env.AI_TOOLS_ENABLED !== 'true') {
      throw new ServiceUnavailableException({ code: 'AI_DISABLED' });
    }

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are a project management expert. Analyze the given project and provide a health score (0-100), identify risks, and suggest recommendations.`,
      },
      {
        role: 'user',
        content: `Project ID: ${request.projectId}\nProject Type: ${request.projectType || 'professional'}\nInclude Recommendations: ${request.includeRecommendations || true}`,
      },
    ];

    const _response = await this.llmProvider.callLLM(messages);

    // Parse the LLM response (in a real implementation, you'd use structured output)
    return {
      healthScore: 75,
      risks: [
        {
          id: '1',
          title: 'Potential scope creep',
          severity: 'MEDIUM' as const,
        },
        { id: '2', title: 'Resource constraints', severity: 'HIGH' as const },
      ],
      recommendations: request.includeRecommendations
        ? [
            {
              id: '1',
              title: 'Regular scope reviews',
              rationale: 'Prevent scope creep',
            },
            {
              id: '2',
              title: 'Resource allocation review',
              rationale: 'Address resource constraints',
            },
          ]
        : [],
    };
  }

  async generateTasks(
    request: GenerateTasksRequestDto,
    userId?: string,
  ): Promise<GenerateTasksResponseDto> {
    if (process.env.AI_TOOLS_ENABLED !== 'true') {
      throw new ServiceUnavailableException({ code: 'AI_DISABLED' });
    }

    return this.taskGeneratorTool.generateTasks(request, userId);
  }

  async generateLinkedTasksPreview(
    request: GenerateLinkedTasksRequestDto,
    userId?: string,
  ): Promise<GenerateLinkedTasksPreviewDto> {
    if (process.env.AI_TOOLS_ENABLED !== 'true') {
      throw new ServiceUnavailableException({ code: 'AI_DISABLED' });
    }
    return this.taskRelationshipGeneratorTool.generatePreview(request, userId);
  }

  async confirmLinkedTasks(
    request: ConfirmLinkedTasksDto,
    userId?: string,
  ): Promise<GenerateLinkedTasksResponseDto> {
    if (process.env.AI_TOOLS_ENABLED !== 'true') {
      throw new ServiceUnavailableException({ code: 'AI_DISABLED' });
    }
    return this.taskRelationshipGeneratorTool.confirmAndCreate(request, userId);
  }
}
