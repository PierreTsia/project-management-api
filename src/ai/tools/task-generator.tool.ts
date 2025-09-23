import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { LlmProviderService } from '../llm-provider.service';
import { ContextService } from '../context/context.service';
import { AiRedactionService } from '../ai.redaction.service';
import { AiTracingService } from '../ai.tracing.service';
import {
  GenerateTasksRequestDto,
  GenerateTasksResponseDto,
  GeneratedTaskDto,
} from '../dto/generate-tasks.dto';
import { GenerateTasksResponseSchema } from '../dto/generate-tasks.validation';

@Injectable()
export class TaskGeneratorTool {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly contextService: ContextService,
    private readonly redaction: AiRedactionService,
    private readonly tracing: AiTracingService,
  ) {}

  @Tool({ name: 'generate_tasks_from_requirement' })
  async generateTasks(
    params: GenerateTasksRequestDto,
  ): Promise<GenerateTasksResponseDto> {
    return this.tracing.withSpan('ai.taskgen.call', async () => {
      const { provider, model } = this.llmProvider.getInfo();
      let degraded = false;
      let contextInfo = '';

      // Get optional project context
      if (params.projectId) {
        try {
          const project = await this.contextService.getProject(
            params.projectId,
          );
          const tasks = await this.contextService.getTasks(params.projectId);

          if (project) {
            const redactedProject = this.redaction.redactProject(project);
            contextInfo = `Project: ${redactedProject.name}\n`;

            if (tasks && tasks.length > 0) {
              const topTasks = tasks
                .slice(0, 5)
                .map((t) => t.title)
                .join(', ');
              contextInfo += `Recent tasks: ${topTasks}\n`;
            }
          }
        } catch (error) {
          degraded = true;
        }
      }

      const messages = [
        {
          role: 'system' as const,
          content: `You are a precise task generator. Output ONLY valid JSON matching the provided schema. No IDs.

Rules:
- No additional fields.
- Titles ≤ 80 chars. Descriptions ≤ 240 chars.
- No IDs. No markdown. JSON only.
- Generate 3-12 actionable tasks.`,
        },
        {
          role: 'user' as const,
          content: `Generate 3–12 actionable tasks from this intent:

${contextInfo}Intent: ${params.prompt}

Schema:
{
  "tasks": [
    {
      "title": string,
      "description"?: string,
      "priority"?: "LOW" | "MEDIUM" | "HIGH"
    }
  ]
}`,
        },
      ];

      // Timeout handled by provider abstraction (PR-002)
      // Config: LLM_TASKGEN_TIMEOUT_MS (defaults to provider timeout)
      const response = await this.llmProvider.callLLM(messages);

      try {
        // Robust JSON extraction from LLM responses
        const cleanResponse = this.extractJSONFromResponse(response);
        const parsed = JSON.parse(cleanResponse);
        const validated = GenerateTasksResponseSchema.parse(parsed);

        return {
          tasks: validated.tasks as ReadonlyArray<GeneratedTaskDto>,
          meta: {
            model,
            provider,
            degraded,
          },
        };
      } catch (error) {
        // Fallback to minimal tasks if parsing fails
        return {
          tasks: [
            {
              title: 'Analyze requirements',
              description:
                'Break down the requirement into detailed specifications',
              priority: 'HIGH' as const,
            },
            {
              title: 'Create implementation plan',
              description: 'Design the technical approach and timeline',
              priority: 'HIGH' as const,
            },
            {
              title: 'Execute implementation',
              description: 'Implement the solution according to the plan',
              priority: 'MEDIUM' as const,
            },
          ],
          meta: {
            model,
            provider,
            degraded: true,
          },
        };
      }
    });
  }

  private extractJSONFromResponse(response: string): string {
    // Handle various LLM response formats
    const patterns = [
      // Markdown code blocks
      /```json\s*([\s\S]*?)\s*```/,
      // XML-like tags
      /<json>\s*([\s\S]*?)\s*<\/json>/i,
      // Direct JSON (fallback)
      /^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/,
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        return match[1]?.trim() || match[0]?.trim();
      }
    }

    // If no pattern matches, return the original response
    return response.trim();
  }
}
