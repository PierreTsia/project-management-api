import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { LlmProviderService } from '../llm-provider.service';
import { AiTracingService } from '../ai.tracing.service';
import { CustomLogger } from '../../common/services/logger.service';
import { TasksService } from '../../tasks/tasks.service';
import { CreateTaskBulkDto } from '../../tasks/dto/create-task-bulk.dto';
import { TaskLinkService } from '../../tasks/services/task-link.service';
import { CreateTaskLinkDto } from '../../tasks/dto/create-task-link.dto';
import {
  TASK_LINK_TYPES,
  TaskLinkType,
} from '../../tasks/enums/task-link-type.enum';
import { TaskGeneratorTool } from './task-generator.tool';
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
import { GeneratedTaskDto, Priority } from '../dto/generate-tasks.dto';
import {
  GenerateTasksRequestDto,
  GenerateTasksResponseDto,
} from '../dto/generate-tasks.dto';
import { SystemMessage, HumanMessage, initChatModel } from 'langchain';
import { normalizeOutputContent } from '../utils/message.utils';
import { TaskPriority } from '../../tasks/enums/task-priority.enum';

const isTaskLinkType = (value: string): value is TaskLinkType =>
  (TASK_LINK_TYPES as readonly string[]).includes(value);

const toTaskLinkType = (value: string): TaskLinkType | null =>
  isTaskLinkType(value) ? value : null;

const mapAiPriorityToTaskPriority = (
  p?: Priority,
): TaskPriority | undefined => {
  if (!p) return undefined;
  switch (p) {
    case 'LOW':
      return TaskPriority.LOW;
    case 'MEDIUM':
      return TaskPriority.MEDIUM;
    case 'HIGH':
      return TaskPriority.HIGH;
    default:
      return undefined;
  }
};

const PROMPTS = {
  REL_SYSTEM: (
    allowedTypes: ReadonlyArray<string>,
    locale: string,
    maxEdges: number,
  ) =>
    [
      'You are a senior project planner specializing in task decomposition and dependency mapping.',
      'Act as a cautious dependency analyst: only create BLOCKS when the source clearly enables the target; otherwise prefer RELATES_TO.',
      'Output policy:',
      '- Output ONLY a JSON array, no prose or markdown.',
      '- Use placeholder task references: task_1, task_2, … matching the given ordered list.',
      `- Allowed types: ${allowedTypes.join(', ')}`,
      '- Type semantics (concise):',
      '-   BLOCKS: target can’t start/finish until source is done.',
      '-   RELATES_TO: weak association; no strict order.',
      '-   DUPLICATES: target is the same work as source.',
      '-   SPLITS_TO: source breaks down into target (target is a part of source).',
      '- Decision rubric:',
      '-   Prefer local, short hops over long-range links; avoid skipping intermediate steps without strong evidence.',
      `-   Aim for at most ${maxEdges} edges total; at most 1 outgoing BLOCKS per task when clearly justified.`,
      '-   Reject circular/self/duplicate edges.',
      `- Respond in ${locale}.`,
    ].join('\n'),
  REL_USER: (taskList: string) =>
    [
      'Given these tasks, propose a concise set of relationships as a JSON array of objects with fields: sourceTask, targetTask, type.',
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
} as const;

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
          tasks: createdTasks,
          relationships: createdLinks,
          totalLinks: total,
          createdLinks: created,
          rejectedLinks: total - created,
          rejectedRelationships: rejected,
        };
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
      locale: locale || 'en',
      options: params.options,
    };
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

    const allowedTypes = TASK_LINK_TYPES as ReadonlyArray<string>;

    const maxEdges = Math.min(8, Math.max(3, Math.ceil(tasks.length / 2)));

    const system = new SystemMessage(
      PROMPTS.REL_SYSTEM(allowedTypes, locale || 'en', maxEdges),
    );

    const taskList = tasks
      .map(
        (t, i) =>
          `task_${i + 1}: ${t.title}${t.description ? ` — ${t.description}` : ''}`,
      )
      .join('\n');

    const user = new HumanMessage(PROMPTS.REL_USER(taskList));

    try {
      const result = await chatModel.invoke([system, user]);
      const text = normalizeOutputContent(result);
      this.logger.debug(`[ai.rels] rawTextLength=${text.length}`);
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        this.logger.debug('[ai.rels] parsed is not array');
        return [];
      }

      this.logger.debug(`[ai.rels] parsedCount=${parsed.length}]`);

      const filtered: TaskRelationshipPreviewDto[] = parsed
        .filter(
          (r) =>
            typeof r?.sourceTask === 'string' &&
            typeof r?.targetTask === 'string' &&
            toTaskLinkType(r.type) !== null,
        )
        .map((r) => {
          const t = toTaskLinkType(r.type)!;
          return {
            sourceTask: r.sourceTask,
            targetTask: r.targetTask,
            type: t,
          };
        });

      this.logger.debug(
        `[ai.rels] filteredCount=${filtered.length} keptTypes=[${[...new Set(filtered.map((f) => f.type))].join(', ')}]`,
      );

      return filtered;
    } catch (err) {
      this.logger.warn(
        `Relationship generation failed; err=${
          err instanceof Error ? err.message : String(err)
        }`,
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
        priority: mapAiPriorityToTaskPriority(t.priority),
      })),
    };

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
      type: rel.type,
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
          type: rel.type,
        };
        await this.taskLinkService.createLink(input);
        created.push(rel);
      } catch (e) {
        const message = e?.message || 'Unknown';
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
    if (m.includes('duplicate') || m.includes('already_exists'))
      return RejectedReasonCode.DUPLICATE;
    if (m.includes('hierarchy') || m.includes('self'))
      return RejectedReasonCode.INVALID;
    return RejectedReasonCode.UNKNOWN;
  }
}
