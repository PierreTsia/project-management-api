import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { LlmProviderService } from '../llm-provider.service';
import { ContextService } from '../context/context.service';
import { AiRedactionService } from '../ai.redaction.service';
import { AiTracingService } from '../ai.tracing.service';
import { CustomLogger } from '../../common/services/logger.service';
import { ValidateDatesTool } from './validate-dates.tool';
import {
  ConfirmLinkedTasksDto,
  GenerateLinkedTasksPreviewDto,
  GenerateLinkedTasksRequestDto,
  GenerateLinkedTasksResponseDto,
  TaskRelationshipDto,
  TaskRelationshipPreviewDto,
} from '../dto/linked-tasks.dto';
import { GeneratedTaskDto } from '../dto/generate-tasks.dto';

@Injectable()
export class TaskRelationshipGeneratorTool {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly contextService: ContextService,
    private readonly redaction: AiRedactionService,
    private readonly tracing: AiTracingService,
    private readonly logger: CustomLogger,
    private readonly validateDatesTool: ValidateDatesTool,
  ) {}

  @Tool({ name: 'generate_task_relationships_preview' })
  async generatePreview(
    params: GenerateLinkedTasksRequestDto,
    userId?: string,
  ): Promise<GenerateLinkedTasksPreviewDto> {
    return this.tracing.withSpan(
      'ai.taskgen.relationships.preview',
      async () => {
        if (process.env.AI_TOOLS_ENABLED !== 'true') {
          throw new ServiceUnavailableException({ code: 'AI_DISABLED' });
        }
        const tasks = await this.generateTasks(params, userId);
        const relationships =
          await this.generatePlaceholderRelationships(tasks);
        return {
          tasks,
          relationships,
          meta: {
            placeholderMode: true,
            resolutionInstructions: tasks
              .map((t, i) => `task_${i + 1} = "${t.title}"`)
              .join('\n'),
          },
        };
      },
    );
  }

  @Tool({ name: 'confirm_task_relationships' })
  async confirmAndCreate(
    params: ConfirmLinkedTasksDto,
    _userId?: string,
  ): Promise<GenerateLinkedTasksResponseDto> {
    return this.tracing.withSpan(
      'ai.taskgen.relationships.confirm',
      async () => {
        const createdTasks = await this.createTasks(params);
        const resolved = this.resolvePlaceholders(
          params.relationships || [],
          createdTasks,
        );
        const createdLinks = await this.createRelationships(resolved);
        return { tasks: createdTasks, relationships: createdLinks };
      },
    );
  }

  private async generateTasks(
    params: GenerateLinkedTasksRequestDto,
    _userId?: string,
  ): Promise<ReadonlyArray<GeneratedTaskDto>> {
    // Delegate to existing TaskGeneratorTool through AiService in later phase; placeholder here for Phase 0 DTO wiring
    const context = await this.contextService
      .getProject(params.projectId)
      .catch(() => undefined);
    const title = context?.name
      ? `${params.prompt} — ${context.name}`
      : params.prompt;
    return [
      { title: `${title}: Task 1`, description: undefined, priority: 'MEDIUM' },
      { title: `${title}: Task 2`, description: undefined, priority: 'MEDIUM' },
      { title: `${title}: Task 3`, description: undefined, priority: 'MEDIUM' },
    ] as ReadonlyArray<GeneratedTaskDto>;
  }

  private async generatePlaceholderRelationships(
    tasks: ReadonlyArray<{ title: string }>,
  ): Promise<ReadonlyArray<TaskRelationshipPreviewDto>> {
    if (!tasks.length) return [];
    if (tasks.length < 2) return [];
    return [
      { sourceTask: 'task_1', targetTask: 'task_2', type: 'BLOCKS' as any },
    ];
  }

  private async createTasks(
    params: ConfirmLinkedTasksDto,
  ): Promise<ReadonlyArray<{ id: string; title: string }>> {
    // Phase 1 will call TasksService.createMany; Phase 0 returns stubbed IDs for wiring
    return params.tasks.map((t, i) => ({
      id: `stub-${i + 1}`,
      title: t.title,
    }));
  }

  private resolvePlaceholders(
    relationships: ReadonlyArray<TaskRelationshipPreviewDto>,
    tasks: ReadonlyArray<{ id: string; title: string }>,
  ): ReadonlyArray<TaskRelationshipDto> {
    return relationships.map((rel) => ({
      sourceTaskId: this.lookup(rel.sourceTask, tasks),
      targetTaskId: this.lookup(rel.targetTask, tasks),
      type: rel.type as any,
      projectId: tasks.length ? 'unknown-project' : 'unknown-project',
    }));
  }

  private lookup(
    placeholder: string,
    tasks: ReadonlyArray<{ id: string }>,
  ): string {
    const m = placeholder.match(/task_(\d+)/);
    if (m) {
      const idx = Number(m[1]) - 1;
      return tasks[idx]?.id ?? placeholder;
    }
    return placeholder;
  }

  private async createRelationships(
    relationships: ReadonlyArray<TaskRelationshipDto>,
  ): Promise<ReadonlyArray<TaskRelationshipDto>> {
    // Phase 1 will call validation chain + TaskLinkService; Phase 0 echoes input
    return relationships;
  }
}
