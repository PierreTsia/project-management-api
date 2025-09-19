// NestJS Core
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// External Modules
import { ProjectsModule } from '../projects/projects.module';
import { LoggerModule } from '../common/services/logger.module';

// Entities
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { TaskLink } from './entities/task-link.entity';
import { TaskHierarchy } from './entities/task-hierarchy.entity';

// Services
import { TasksService } from './tasks.service';
import { CommentsService } from './services/comments.service';
import { TaskStatusService } from './services/task-status.service';
import { TaskLinkService } from './services/task-link.service';
import { TaskHierarchyService } from './services/task-hierarchy.service';
import { TaskRelationshipHydrator } from './services/task-relationship-hydrator.service';
import { CustomLogger } from '../common/services/logger.service';

// Controllers
import { TasksController } from './tasks.controller';
import { GlobalTasksController } from './controllers/global-tasks.controller';
import { CommentsController } from './controllers/comments.controller';
import { TaskLinkController } from './controllers/task-link.controller';
import { TaskHierarchyController } from './controllers/task-hierarchy.controller';

// Validation Chains
import { TaskRelationshipValidationChain } from './services/validation/task-relationship-validator';
import { HierarchyValidationChain } from './services/validation/hierarchy-validation-chain';

// Global Validators
import {
  SameProjectValidator,
  SelfLinkingValidator,
  LinkLimitValidator,
  CircularDependencyValidator,
  HierarchyConflictValidatorHandler,
} from './services/validation/global-validators';

// Link Type Validators
import {
  BlocksLinkValidator,
  DuplicatesLinkValidator,
} from './services/validation/link-type-validators';

// Hierarchy Validators
import {
  SelfHierarchyValidator,
  CircularHierarchyValidator,
  HierarchyDepthValidator,
  HierarchyConflictValidator as HierarchyConflictValidatorNew,
  LinkConflictValidatorForHierarchy,
} from './services/validation/hierarchy-validators';

// Conflict Validators
import { CircularDependencyDetector } from './services/validation/circular-dependency-detector';
import { HierarchyConflictValidator } from './services/validation/hierarchy-conflict-validator';
import { LinkConflictValidator } from './services/validation/link-conflict-validator';

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
    TaskHierarchyController,
  ],
  providers: [
    // Core Services
    TasksService,
    CommentsService,
    TaskStatusService,
    CustomLogger,
    TaskLinkService,
    TaskHierarchyService,
    TaskRelationshipHydrator,

    // Global Validators
    SameProjectValidator,
    SelfLinkingValidator,
    {
      provide: LinkLimitValidator,
      useFactory: () => new LinkLimitValidator(TASK_LINK_LIMIT),
    },
    CircularDependencyValidator,
    HierarchyConflictValidatorHandler,

    // Link Type Validators
    BlocksLinkValidator,
    DuplicatesLinkValidator,

    // Hierarchy Validators
    SelfHierarchyValidator,
    CircularHierarchyValidator,
    HierarchyDepthValidator,
    HierarchyConflictValidatorNew,
    LinkConflictValidatorForHierarchy,

    // Conflict Validators
    CircularDependencyDetector,
    HierarchyConflictValidator,
    LinkConflictValidator,

    // Validation Chains (with factories)
    {
      provide: TaskRelationshipValidationChain,
      useFactory: (
        sameProjectValidator: SameProjectValidator,
        selfLinkingValidator: SelfLinkingValidator,
        linkLimitValidator: LinkLimitValidator,
        circularDependencyValidator: CircularDependencyValidator,
        hierarchyConflictValidator: HierarchyConflictValidatorHandler,
        blocksLinkValidator: BlocksLinkValidator,
        duplicatesLinkValidator: DuplicatesLinkValidator,
      ) => {
        // Shared chain: order matters
        sameProjectValidator
          .setNext(selfLinkingValidator)
          .setNext(linkLimitValidator)
          .setNext(circularDependencyValidator)
          .setNext(hierarchyConflictValidator);
        const relationshipValidator = new TaskRelationshipValidationChain();

        relationshipValidator.setValidationChain(sameProjectValidator);
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
        CircularDependencyValidator,
        HierarchyConflictValidatorHandler,
        BlocksLinkValidator,
        DuplicatesLinkValidator,
      ],
    },
    {
      provide: HierarchyValidationChain,
      useFactory: (
        selfHierarchyValidator: SelfHierarchyValidator,
        circularHierarchyValidator: CircularHierarchyValidator,
        hierarchyDepthValidator: HierarchyDepthValidator,
        hierarchyConflictValidator: HierarchyConflictValidatorNew,
        linkConflictValidatorForHierarchy: LinkConflictValidatorForHierarchy,
      ) => {
        // Build the hierarchy validation chain
        selfHierarchyValidator
          .setNext(circularHierarchyValidator)
          .setNext(hierarchyDepthValidator)
          .setNext(hierarchyConflictValidator)
          .setNext(linkConflictValidatorForHierarchy);

        const hierarchyValidationChain = new HierarchyValidationChain(
          selfHierarchyValidator,
          circularHierarchyValidator,
          hierarchyDepthValidator,
          hierarchyConflictValidator,
          linkConflictValidatorForHierarchy,
        );

        hierarchyValidationChain.setValidationChain(selfHierarchyValidator);
        return hierarchyValidationChain;
      },
      inject: [
        SelfHierarchyValidator,
        CircularHierarchyValidator,
        HierarchyDepthValidator,
        HierarchyConflictValidatorNew,
        LinkConflictValidatorForHierarchy,
      ],
    },
  ],
  exports: [
    // Core Services
    TasksService,
    CommentsService,
    TaskLinkService,
    TaskHierarchyService,
    TaskRelationshipHydrator,

    // Validation Chains
    TaskRelationshipValidationChain,
    HierarchyValidationChain,
  ],
})
export class TasksModule {}
