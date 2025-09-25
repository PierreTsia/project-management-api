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
  RejectedRelationshipDto,
  RejectedReasonCode,
} from '../dto/linked-tasks.dto';
import { GeneratedTaskDto } from '../dto/generate-tasks.dto';
import { TasksService } from '../../tasks/tasks.service';
import { CreateTaskBulkDto } from '../../tasks/dto/create-task-bulk.dto';
import { TaskLinkService } from '../../tasks/services/task-link.service';
import { CreateTaskLinkDto } from '../../tasks/dto/create-task-link.dto';
import { TaskLinkType as DomainTaskLinkType } from '../../tasks/enums/task-link-type.enum';
import { TaskGeneratorTool } from './task-generator.tool';
import {
  GenerateTasksRequestDto,
  GenerateTasksResponseDto,
} from '../dto/generate-tasks.dto';

@Injectable()
export class TaskRelationshipGeneratorTool {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly contextService: ContextService,
    private readonly redaction: AiRedactionService,
    private readonly tracing: AiTracingService,
    private readonly logger: CustomLogger,
    private readonly validateDatesTool: ValidateDatesTool,
    private readonly tasksService: TasksService,
    private readonly taskLinkService: TaskLinkService,
    private readonly taskGeneratorTool: TaskGeneratorTool,
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
        const { createdLinks, rejected } =
          await this.createRelationships(resolved);
        const total = resolved.length;
        const created = createdLinks.length;
        return {
          tasks: createdTasks as any,
          relationships: createdLinks as any,
          totalLinks: total,
          createdLinks: created,
          rejectedLinks: total - created,
          rejectedRelationships: rejected,
        } as any;
      },
    );
  }

  private async generateTasks(
    params: GenerateLinkedTasksRequestDto,
    userId?: string,
  ): Promise<ReadonlyArray<GeneratedTaskDto>> {
    const req: GenerateTasksRequestDto = {
      prompt: params.prompt,
      projectId: params.projectId,
      locale: 'en',
      options: { taskCount: 5 },
    } as GenerateTasksRequestDto;
    const result: GenerateTasksResponseDto =
      await this.taskGeneratorTool.generateTasks(req, userId);
    return result.tasks;
  }

  private async generatePlaceholderRelationships(
    tasks: ReadonlyArray<{ title: string }>,
  ): Promise<ReadonlyArray<TaskRelationshipPreviewDto>> {
    if (!tasks.length) return [];
    if (tasks.length < 2) return [];
    // Minimal chain: link first -> second only for POC
    return [
      { sourceTask: 'task_1', targetTask: 'task_2', type: 'BLOCKS' as any },
    ];
  }

  private async createTasks(
    params: ConfirmLinkedTasksDto,
  ): Promise<ReadonlyArray<{ id: string; title: string; projectId: string }>> {
    const bulk: CreateTaskBulkDto = {
      items: params.tasks.map((t) => ({
        title: t.title,
        description: t.description,
        priority: (t.priority as any) ?? undefined,
        dueDate: (t as any).dueDate,
        assigneeId: (t as any).assigneeId,
      })),
    } as CreateTaskBulkDto;

    const saved = await this.tasksService.createMany(bulk, params.projectId);
    return saved.map((s) => ({
      id: s.id,
      title: s.title,
      projectId: s.projectId,
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
      projectId: (tasks as any)[0]?.projectId ?? 'unknown-project',
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
  ): Promise<{
    createdLinks: ReadonlyArray<TaskRelationshipDto>;
    rejected: ReadonlyArray<RejectedRelationshipDto>;
  }> {
    const created: TaskRelationshipDto[] = [];
    const rejected: RejectedRelationshipDto[] = [];

    for (const rel of relationships) {
      try {
        const input: CreateTaskLinkDto = {
          projectId: rel.projectId,
          sourceTaskId: rel.sourceTaskId,
          targetTaskId: rel.targetTaskId,
          type: rel.type as unknown as DomainTaskLinkType,
        };
        await this.taskLinkService.createLink(input);
        created.push(rel);
      } catch (e: any) {
        const message = String(e?.message || 'Unknown');
        const reasonCode = this.mapReasonToCode(message);
        rejected.push({
          sourceTaskId: rel.sourceTaskId,
          targetTaskId: rel.targetTaskId,
          type: rel.type,
          reasonCode,
          reasonMessage: message,
        });
      }
    }

    return { createdLinks: created, rejected };
  }

  private mapReasonToCode(message: string): RejectedReasonCode {
    const m = message.toLowerCase();
    if (m.includes('project')) return RejectedReasonCode.CROSS_PROJECT;
    if (m.includes('circular')) return RejectedReasonCode.CIRCULAR;
    if (m.includes('duplicate')) return RejectedReasonCode.DUPLICATE;
    if (m.includes('hierarchy')) return RejectedReasonCode.INVALID;
    return RejectedReasonCode.UNKNOWN;
  }
}
