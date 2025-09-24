import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { LlmProviderService } from '../llm-provider.service';
import { ContextService } from '../context/context.service';
import { AiRedactionService } from '../ai.redaction.service';
import { AiTracingService } from '../ai.tracing.service';
import { CustomLogger } from '../../common/services/logger.service';
import {
  GenerateTasksRequestDto,
  GenerateTasksResponseDto,
} from '../dto/generate-tasks.dto';
import { GenerateTasksResponseSchema } from '../dto/generate-tasks.validation';
import { normalizeMultiline } from '../utils/text.utils';

@Injectable()
export class TaskGeneratorTool {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly contextService: ContextService,
    private readonly redaction: AiRedactionService,
    private readonly tracing: AiTracingService,
    private readonly logger: CustomLogger,
  ) {}

  @Tool({ name: 'generate_tasks_from_requirement' })
  async generateTasks(
    params: GenerateTasksRequestDto,
    userId?: string,
  ): Promise<GenerateTasksResponseDto> {
    return this.tracing.withSpan('ai.taskgen.call', async () => {
      const { provider, model } = this.llmProvider.getInfo();
      let degraded = false;
      const requestedLocale = this.getRequestedLocale(params);
      const localeDirective = this.buildLocaleDirective(requestedLocale);
      const hasOptions = this.hasOptions(params);
      const constraints = this.buildConstraints(params);
      const desiredTaskCount = this.computeDesiredTaskCount(params);
      const contextInfo = await this.buildContextInfo(params, userId).catch(
        (err) => {
          degraded = true;
          this.logger.error('TaskGen context retrieval failed', err?.stack);
          return '';
        },
      );

      const messages = this.buildMessages({
        localeDirective,
        desiredTaskCount,
        contextInfo,
        prompt: params.prompt,
        hasOptions,
        constraints,
        requestedLocale,
      });

      // Timeout handled by provider abstraction (PR-002)
      // Config: LLM_TASKGEN_TIMEOUT_MS (defaults to provider timeout)
      const response = await this.llmProvider.callLLM(messages);

      try {
        // Robust JSON extraction from LLM responses
        const cleanResponse = this.extractJSONFromResponse(response);
        const parsed = JSON.parse(cleanResponse);
        const validated = GenerateTasksResponseSchema.parse(parsed);

        return {
          tasks: validated.tasks,
          meta: {
            model,
            provider,
            degraded,
            locale: requestedLocale,
            options: params.options,
          },
        };
      } catch (error) {
        this.logger.error(
          'TaskGen JSON parsing/validation failed',
          (error as any)?.stack,
        );
        // Fallback to minimal tasks if parsing fails
        return {
          tasks: this.getFallbackTasks(),
          meta: {
            model,
            provider,
            degraded: true,
            locale: requestedLocale,
            options: params.options,
          },
        };
      }
    });
  }

  private getFallbackTasks(): ReadonlyArray<{
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
  }> {
    return [
      {
        title: 'Analyze requirements',
        description: 'Break down the requirement into detailed specifications',
        priority: 'HIGH',
      },
      {
        title: 'Create implementation plan',
        description: 'Design the technical approach and timeline',
        priority: 'HIGH',
      },
      {
        title: 'Execute implementation',
        description: 'Implement the solution according to the plan',
        priority: 'MEDIUM',
      },
    ] as const;
  }

  private getRequestedLocale(params: GenerateTasksRequestDto): string {
    return (params.locale || 'en').toLowerCase();
  }

  private buildLocaleDirective(locale: string): string {
    return locale === 'fr'
      ? 'Répondez strictement en français.'
      : 'Respond strictly in English.';
  }

  private hasOptions(params: GenerateTasksRequestDto): boolean {
    return Boolean(params.options && Object.keys(params.options).length > 0);
  }

  private buildConstraints(params: GenerateTasksRequestDto): string {
    if (!this.hasOptions(params)) return '';
    const entries = Object.entries(
      params.options as Record<string, string | number | boolean>,
    );
    return entries.map(([key, value]) => `${key}=${String(value)}`).join('; ');
  }

  private computeDesiredTaskCount(params: GenerateTasksRequestDto): number {
    const MIN_TASKS = 3;
    const MAX_TASKS = 12;
    const DEFAULT_TASK_COUNT = 6;
    const rawRequestedCount =
      typeof params.options?.taskCount === 'number'
        ? params.options.taskCount
        : undefined;
    if (rawRequestedCount === undefined) return DEFAULT_TASK_COUNT;
    const rounded = Math.round(rawRequestedCount);
    return Math.max(MIN_TASKS, Math.min(MAX_TASKS, rounded));
  }

  private async buildContextInfo(
    params: GenerateTasksRequestDto,
    userId?: string,
  ): Promise<string> {
    if (!params.projectId) return '';
    const project = await this.contextService.getProject(
      params.projectId,
      userId,
    );
    const tasks = await this.contextService.getTasks(params.projectId);
    if (!project) return '';
    const redactedProject = this.redaction.redactProject(project);
    const redactedDesc = this.redaction.sanitizeText(project.description ?? '');
    let info = `Project: ${redactedProject.name}\n`;
    if (redactedDesc) {
      info += `Goal: ${redactedDesc}\n`;
    }
    if (tasks && tasks.length > 0) {
      const topTasks = tasks
        .slice(0, 5)
        .map((t) => t.title) // we might want to add gradually some description and estimates, assignees in the future
        .join(', ');
      info += `Recent tasks: ${topTasks}\n`;
    }
    return info;
  }

  private buildMessages(input: {
    localeDirective: string;
    desiredTaskCount: number;
    contextInfo: string;
    prompt: string;
    hasOptions: boolean;
    constraints: string;
    requestedLocale: string;
  }): { role: 'system' | 'user'; content: string }[] {
    const systemContent = `You are a precise task generator. Output ONLY valid JSON matching the provided schema. No IDs.
                            Rules:
                            - No additional fields.
                            - Titles ≤ 80 chars. Descriptions ≤ 240 chars.
                            - No IDs. No markdown. JSON only.
                            - Generate 3-12 actionable tasks.
                            - If a desired task count is provided, generate exactly that many within 3–12.
                            - If no desired task count is provided, generate exactly ${input.desiredTaskCount} tasks.
                            - Language policy: ${input.localeDirective}`;

    const userContent = `Generate 3–12 actionable tasks from this intent:

                      ${input.contextInfo ? `${input.contextInfo.trim()}` : ''}Intent: ${input.prompt}
                      ${input.hasOptions ? `Constraints: ${input.constraints}` : ''}
                      DesiredTaskCount: ${input.desiredTaskCount}
                      Language: ${input.requestedLocale}

                      Schema:
                      {
                        "tasks": [
                          {
                            "title": string,
                            "description"?: string,
                            "priority"?: "LOW" | "MEDIUM" | "HIGH"
                          }
                        ]
                      }`;

    const systemClean = normalizeMultiline(systemContent);
    const userClean = normalizeMultiline(userContent);

    return [
      { role: 'system', content: systemClean },
      { role: 'user', content: userClean },
    ];
  }

  // normalization moved to shared util

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
        const candidate = match[1]?.trim() || match[0]?.trim();
        if (candidate && candidate.length > 0) {
          return candidate;
        }
        // else continue to next pattern
      }
    }

    // If no pattern matches, return the original response
    return response.trim();
  }
}
