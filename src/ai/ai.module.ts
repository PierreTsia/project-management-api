import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { AiController } from './ai.controller';
import { AiService } from '../ai/ai.service';
import { LlmProviderService } from '../ai/llm-provider.service';
import { AiMetricsService } from './ai.metrics.service';
import { ProviderFactory } from './provider.factory';
import { MistralProvider } from './providers/mistral.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { LangchainProvider } from './providers/langchain.provider';
import { AiBootstrapService } from './ai.bootstrap.service';
import { AiRedactionService } from './ai.redaction.service';
import { AiTracingService } from './ai.tracing.service';
import { ContextService } from './context/context.service';
import { ProjectsContextAdapter } from './context/adapters/projects-context.adapter';
import { TasksContextAdapter } from './context/adapters/tasks-context.adapter';
import { TeamContextAdapter } from './context/adapters/team-context.adapter';
import { TaskGeneratorTool } from './tools/task-generator.tool';
import { NormalizeTitleTool } from './tools/normalize-title.tool';
import { EstimateEffortTool } from './tools/estimate-effort.tool';
import { ValidateDatesTool } from './tools/validate-dates.tool';

@Module({
  imports: [ProjectsModule, TasksModule, UsersModule],
  controllers: [AiController],
  providers: [
    AiService,
    LlmProviderService,
    AiMetricsService,
    AiRedactionService,
    AiTracingService,
    ContextService,
    ProjectsContextAdapter,
    TasksContextAdapter,
    TeamContextAdapter,
    ProviderFactory,
    MistralProvider,
    OpenAiProvider,
    LangchainProvider,
    AiBootstrapService,
    TaskGeneratorTool,
    NormalizeTitleTool,
    EstimateEffortTool,
    ValidateDatesTool,
  ],
  exports: [ContextService],
})
export class AiModule {}
