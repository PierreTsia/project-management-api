import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { LlmProviderService } from '../ai/llm-provider.service';
import {
  ProjectHealthRequestDto,
  ProjectHealthResponseDto,
  GenerateTasksRequestDto,
  GenerateTasksResponseDto,
} from './types';

@Injectable()
export class AiService {
  constructor(private readonly llmProvider: LlmProviderService) {}

  async getHello(
    name?: string,
  ): Promise<{ provider: string; model: string; message: string }> {
    if (process.env.AI_TOOLS_ENABLED !== 'true') {
      throw new ServiceUnavailableException({ code: 'AI_DISABLED' });
    }
    const { provider, model } = this.llmProvider.getInfo();
    const safeName = name?.toString().slice(0, 64);
    const message = safeName ? `hello ${safeName}` : 'hello';
    return { provider, model, message };
  }

  async checkProjectHealth(
    request: ProjectHealthRequestDto,
  ): Promise<ProjectHealthResponseDto> {
    if (process.env.AI_TOOLS_ENABLED !== 'true') {
      throw new ServiceUnavailableException({ code: 'AI_DISABLED' });
    }

    const messages = [
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
  ): Promise<GenerateTasksResponseDto> {
    if (process.env.AI_TOOLS_ENABLED !== 'true') {
      throw new ServiceUnavailableException({ code: 'AI_DISABLED' });
    }

    const messages = [
      {
        role: 'system',
        content: `You are a project management expert. Break down the given requirement into specific, actionable tasks with estimates and assignments.`,
      },
      {
        role: 'user',
        content: `Project ID: ${request.projectId}\nRequirement: ${request.requirement}\nProject Type: ${request.projectType || 'professional'}\nPriority: ${request.priority || 'MEDIUM'}`,
      },
    ];

    const _response = await this.llmProvider.callLLM(messages);

    // Parse the LLM response (in a real implementation, you'd use structured output)
    return {
      tasks: [
        {
          title: 'Analyze requirements',
          description:
            'Break down the requirement into detailed specifications',
          estimateHours: 4,
          priority: 'HIGH' as const,
          dependencyIds: [],
          assigneeSuggestion: 'Senior Developer',
        },
        {
          title: 'Create implementation plan',
          description: 'Design the technical approach and timeline',
          estimateHours: 2,
          priority: 'HIGH' as const,
          dependencyIds: ['1'],
          assigneeSuggestion: 'Tech Lead',
        },
      ],
    };
  }
}
