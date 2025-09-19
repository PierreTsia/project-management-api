import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { TaskLink } from './entities/task-link.entity';
import { TaskHierarchy } from './entities/task-hierarchy.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { GlobalTasksController } from './controllers/global-tasks.controller';
import { CommentsService } from './services/comments.service';
import { CommentsController } from './controllers/comments.controller';
import { ProjectsModule } from '../projects/projects.module';
import { TaskStatusService } from './services/task-status.service';
import { CustomLogger } from '../common/services/logger.service';
import { LoggerModule } from '../common/services/logger.module';
import { TaskLinkService } from './services/task-link.service';
import { TaskLinkController } from './controllers/task-link.controller';
import { TaskRelationshipValidator } from './services/validation/task-relationship-validator';
import {
  SameProjectValidator,
  SelfLinkingValidator,
  LinkLimitValidator,
} from './services/validation/global-validators';
import {
  BlocksLinkValidator,
  DuplicatesLinkValidator,
} from './services/validation/link-type-validators';

export const TASK_LINK_LIMIT = 20;

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Comment, TaskLink, TaskHierarchy]),
    ProjectsModule,
    LoggerModule,
  ],
  controllers: [
    TasksController,
    GlobalTasksController,
    CommentsController,
    TaskLinkController,
  ],
  providers: [
    TasksService,
    CommentsService,
    TaskStatusService,
    CustomLogger,
    TaskLinkService,
    // Validators
    SameProjectValidator,
    SelfLinkingValidator,
    {
      provide: LinkLimitValidator,
      useFactory: () => new LinkLimitValidator(TASK_LINK_LIMIT),
    },
    BlocksLinkValidator,
    DuplicatesLinkValidator,
    {
      provide: TaskRelationshipValidator,
      useFactory: (
        sharedSameProjectValidator: SameProjectValidator,
        sharedSelfLinkingValidator: SelfLinkingValidator,
        sharedLinkLimitValidator: LinkLimitValidator,
        blocksLinkValidator: BlocksLinkValidator,
        duplicatesLinkValidator: DuplicatesLinkValidator,
      ) => {
        // Shared chain: order matters
        sharedSameProjectValidator
          .setNext(sharedSelfLinkingValidator)
          .setNext(sharedLinkLimitValidator);
        const relationshipValidator = new TaskRelationshipValidator();

        relationshipValidator.setValidationChain(sharedSameProjectValidator);
        // Type-specific strategies
        relationshipValidator.registerLinkValidator(
          'BLOCKS',
          blocksLinkValidator,
        );
        relationshipValidator.registerLinkValidator(
          'DUPLICATES',
          duplicatesLinkValidator,
        );
        return relationshipValidator;
      },
      inject: [
        SameProjectValidator,
        SelfLinkingValidator,
        LinkLimitValidator,
        BlocksLinkValidator,
        DuplicatesLinkValidator,
      ],
    },
  ],
  exports: [
    TasksService,
    CommentsService,
    TaskLinkService,
    TaskRelationshipValidator,
  ],
})
export class TasksModule {}
