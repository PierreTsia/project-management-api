import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { LlmProviderService } from '../llm-provider.service';
import { AiTracingService } from '../ai.tracing.service';
import { CustomLogger } from '../../common/services/logger.service';
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
import { SystemMessage, HumanMessage, initChatModel } from 'langchain';

@Injectable()
export class TaskRelationshipGeneratorTool {
  constructor(
    private readonly llmProvider: LlmProviderService,
    private readonly tracing: AiTracingService,
    private readonly logger: CustomLogger,
    private readonly tasksService: TasksService,
    private readonly taskLinkService: TaskLinkService,
    private readonly taskGeneratorTool: TaskGeneratorTool,
  ) {}

  @Tool({ name: 'generate_task_relationships_preview' })
  async generatePreview(
    params: GenerateLinkedTasksRequestDto,
    userId?: string,
    locale?: string,
  ): Promise<GenerateLinkedTasksPreviewDto> {
    return this.tracing.withSpan(
      'ai.taskgen.relationships.preview',
      async () => {
        if (process.env.AI_TOOLS_ENABLED !== 'true') {
          throw new ServiceUnavailableException({ code: 'AI_DISABLED' });
        }
        const tasks = await this.generateTasks(params, userId, locale);
        const relationships = await this.generateAiRelationships(tasks, locale);
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
    _lang?: string,
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
    locale?: string,
  ): Promise<ReadonlyArray<GeneratedTaskDto>> {
    const req: GenerateTasksRequestDto = {
      prompt: params.prompt,
      projectId: params.projectId,
      locale: (locale || 'en') as any,
      options: { taskCount: 5 },
    } as GenerateTasksRequestDto;
    const result: GenerateTasksResponseDto =
      await this.taskGeneratorTool.generateTasks(req, userId, locale || 'en');
    return result.tasks;
  }

  private async generateAiRelationships(
    tasks: ReadonlyArray<{ title: string; description?: string }>,
    locale?: string,
  ): Promise<ReadonlyArray<TaskRelationshipPreviewDto>> {
    if (!tasks.length) return [];

    const { provider, model } = this.llmProvider.getInfo();
    const modelId =
      provider === 'openai' ? `openai:${model}` : `mistralai:${model}`;
    const chatModel = await initChatModel(modelId);

    const allowedTypes = [
      'BLOCKS',
      'IS_BLOCKED_BY',
      'DUPLICATES',
      'IS_DUPLICATED_BY',
      'SPLITS_TO',
      'SPLITS_FROM',
      'RELATES_TO',
    ];

    const system = new SystemMessage(
      [
        'You are a precise task relationship generator.',
        'Output policy:',
        '- Output ONLY a JSON array, no prose or markdown.',
        '- Use placeholder task references: task_1, task_2, … matching the given ordered list.',
        `- Allowed types: ${allowedTypes.join(', ')}`,
        '- Prefer BLOCKS for prerequisite/sequence dependencies; use RELATES_TO for weak semantic associations.',
        '- Avoid circular dependencies; do not link a task to itself.',
        '- Propose between 1 and 3 relationships when logically justified; otherwise return [].',
        `- Respond in ${locale || 'en'}.`,
      ].join('\n'),
    );

    const taskList = tasks
      .map(
        (t, i) =>
          `task_${i + 1}: ${t.title}${t.description ? ` — ${t.description}` : ''}`,
      )
      .join('\n');

    const user = new HumanMessage(
      [
        'Given these tasks, propose up to 3 relationships as a JSON array of objects with fields: sourceTask, targetTask, type.',
        'Use only placeholder IDs task_N. Prefer simple prerequisite chains (BLOCKS) that reflect a natural order of execution.',
        'If two tasks are clearly related but not strictly ordered, you may use RELATES_TO.',
        'Tasks in order:',
        taskList,
        '',
        'Example',
        'Input tasks:',
        'task_1: Design database schema — Define tables for users, roles',
        'task_2: Implement user registration — Persist new users',
        'task_3: Implement user login — Authenticate users',
        'Expected relationships (JSON array only):',
        '[',
        '  { "sourceTask": "task_1", "targetTask": "task_2", "type": "BLOCKS" },',
        '  { "sourceTask": "task_2", "targetTask": "task_3", "type": "BLOCKS" }',
        ']',
        '',
        'Follow the example format strictly; output only the JSON array for the current tasks.',
      ].join('\n'),
    );

    try {
      const result = await chatModel.invoke([system, user]);
      const content = (result as any)?.content ?? '';
      const text = Array.isArray(content)
        ? content
            .map((c) => (typeof c === 'string' ? c : (c?.text ?? '')))
            .join('\n')
        : String(content);
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (r: any) =>
            typeof r?.sourceTask === 'string' &&
            typeof r?.targetTask === 'string' &&
            allowedTypes.includes(String(r?.type)),
        )
        .map((r: any) => ({
          sourceTask: r.sourceTask,
          targetTask: r.targetTask,
          type: r.type,
        }));
    } catch (err) {
      this.logger.warn(
        'Relationship generation failed; falling back to empty set',
      );
      return [];
    }
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
    tasks: ReadonlyArray<{ id: string; title: string; projectId: string }>,
  ): ReadonlyArray<TaskRelationshipDto> {
    return relationships.map((rel) => ({
      sourceTaskId: this.lookup(rel.sourceTask, tasks),
      targetTaskId: this.lookup(rel.targetTask, tasks),
      type: rel.type as any,
      projectId: tasks?.[0]?.projectId ?? 'unknown-project',
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
