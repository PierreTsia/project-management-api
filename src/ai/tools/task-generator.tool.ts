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
import { SystemMessage, HumanMessage } from 'langchain';
import { initChatModel } from 'langchain';
import { ValidateDatesTool } from './validate-dates.tool';

const PROMPTS = {
  SYSTEM: (
    desiredTaskCount: number,
    localeDirective: string,
  ) => `You are a precise task generator. Generate actionable tasks based on the user's intent.

Rules:
- Titles ≤ 80 chars. Descriptions ≤ 240 chars.
- Generate 3-12 actionable tasks.
- If a desired task count is provided, generate exactly that many within 3–12.
- If no desired task count is provided, generate exactly ${desiredTaskCount} tasks.
- Language policy: ${localeDirective}`,

  USER: (
    contextInfo: string,
    prompt: string,
    hasOptions: boolean,
    constraints: string,
    desiredTaskCount: number,
    requestedLocale: string,
  ) => `Generate actionable tasks from this intent:

${contextInfo ? `${contextInfo.trim()}` : ''}Intent: ${prompt}
${hasOptions ? `Constraints: ${constraints}` : ''}
DesiredTaskCount: ${desiredTaskCount}
Language: ${requestedLocale}`,
} as const;

@Injectable()
export class TaskGeneratorTool {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly contextService: ContextService,
    private readonly redaction: AiRedactionService,
    private readonly tracing: AiTracingService,
    private readonly logger: CustomLogger,
    private readonly validateDatesTool: ValidateDatesTool,
  ) {}

  @Tool({ name: 'generate_tasks_from_requirement' })
  async generateTasks(
    params: GenerateTasksRequestDto,
    userId?: string,
  ): Promise<GenerateTasksResponseDto> {
    return this.tracing.withSpan('ai.taskgen.call', async () => {
      const { provider: llmProvider, model: llmModel } =
        this.llmProvider.getInfo();
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

      const systemMessage = new SystemMessage(
        PROMPTS.SYSTEM(desiredTaskCount, localeDirective),
      );

      const userMessage = new HumanMessage(
        PROMPTS.USER(
          contextInfo,
          params.prompt,
          hasOptions,
          constraints,
          desiredTaskCount,
          requestedLocale,
        ),
      );

      const lcMessages = [systemMessage, userMessage];

      const modelId =
        llmProvider === 'openai'
          ? `openai:${llmModel}`
          : `mistralai:${llmModel}`;

      const chatModel = await initChatModel(modelId);

      try {
        // Use LangChain's proper structured output binding
        const structuredModel = chatModel.withStructuredOutput(
          GenerateTasksResponseSchema,
        );
        const result = await structuredModel.invoke([...lcMessages]);

        // Get usage metadata from the provider
        const usageMetadata = this.llmProvider.getLastUsageMetadata?.();

        return {
          tasks: result.tasks,
          meta: {
            model: llmModel,
            provider: llmProvider,
            degraded,
            locale: requestedLocale,
            options: params.options,
            tokensEstimated:
              usageMetadata?.total_tokens || usageMetadata?.totalTokens || null,
            usageMetadata: usageMetadata || null,
          },
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.stack : String(error);
        this.logger.error(
          'TaskGen structured output parsing failed',
          errorMessage,
        );
        // Fallback to minimal tasks if parsing fails
        return {
          tasks: this.getFallbackTasks(),
          meta: {
            model: llmModel,
            provider: llmProvider,
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
}
