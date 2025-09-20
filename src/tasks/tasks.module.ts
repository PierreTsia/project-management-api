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
import { TaskRelationshipValidationChain } from './services/validation/task-relationship-validation-chain';
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
  BlocksTypeValidator,
  DuplicatesTypeValidator,
} from './services/validation/link-type-specific-validators';
import { DuplicateLinkValidator } from './services/validation/duplicate-link-validator';
import { LinkLimitValidator as NewLinkLimitValidator } from './services/validation/link-limit-validator';
import { ValidationChainFactory } from './services/validation/validation-chain-factory';
import { HierarchyValidationChainFactory } from './services/validation/hierarchy-validation-chain-factory';

// Hierarchy Validators
import {
  SelfHierarchyValidator,
  CircularHierarchyValidator,
  HierarchyDepthValidator,
  HierarchyConflictValidator as HierarchyConflictValidatorNew,
  LinkConflictValidatorForHierarchy,
} from './services/validation/hierarchy-validators';
import { MultipleParentValidator } from './services/validation/multiple-parent-validator';

// Conflict Validators
import { CircularDependencyDetector } from './services/validation/circular-dependency-detector';
import { HierarchyConflictValidator } from './services/validation/hierarchy-conflict-validator';
import { LinkConflictValidator } from './services/validation/link-conflict-validator';
import { OneRelationshipPerPairValidator } from './services/validation/one-relationship-per-pair-validator';

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
    BlocksTypeValidator,
    DuplicatesTypeValidator,
    OneRelationshipPerPairValidator,
    DuplicateLinkValidator,
    NewLinkLimitValidator,
    ValidationChainFactory,
    HierarchyValidationChainFactory,

    // Hierarchy Validators
    SelfHierarchyValidator,
    CircularHierarchyValidator,
    HierarchyDepthValidator,
    HierarchyConflictValidatorNew,
    LinkConflictValidatorForHierarchy,
    MultipleParentValidator,

    // Conflict Validators
    CircularDependencyDetector,
    HierarchyConflictValidator,
    LinkConflictValidator,

    // Validation Chains (with factories)
    {
      provide: TaskRelationshipValidationChain,
      useFactory: (
        validationChainFactory: ValidationChainFactory,
        sameProjectValidator: SameProjectValidator,
        selfLinkingValidator: SelfLinkingValidator,
        circularDependencyValidator: CircularDependencyValidator,
        hierarchyConflictValidator: HierarchyConflictValidatorHandler,
        oneRelationshipPerPairValidator: OneRelationshipPerPairValidator,
        blocksTypeValidator: BlocksTypeValidator,
        duplicatesTypeValidator: DuplicatesTypeValidator,
        duplicateLinkValidator: DuplicateLinkValidator,
        newLinkLimitValidator: NewLinkLimitValidator,
      ) => {
        return validationChainFactory.createValidationChain(
          sameProjectValidator,
          selfLinkingValidator,
          circularDependencyValidator,
          hierarchyConflictValidator,
          oneRelationshipPerPairValidator,
          blocksTypeValidator,
          duplicatesTypeValidator,
          duplicateLinkValidator,
          newLinkLimitValidator,
        );
      },
      inject: [
        ValidationChainFactory,
        SameProjectValidator,
        SelfLinkingValidator,
        CircularDependencyValidator,
        HierarchyConflictValidatorHandler,
        OneRelationshipPerPairValidator,
        BlocksTypeValidator,
        DuplicatesTypeValidator,
        DuplicateLinkValidator,
        NewLinkLimitValidator,
      ],
    },
    {
      provide: HierarchyValidationChain,
      useFactory: (
        hierarchyValidationChainFactory: HierarchyValidationChainFactory,
        selfHierarchyValidator: SelfHierarchyValidator,
        circularHierarchyValidator: CircularHierarchyValidator,
        hierarchyDepthValidator: HierarchyDepthValidator,
        hierarchyConflictValidator: HierarchyConflictValidatorNew,
        linkConflictValidatorForHierarchy: LinkConflictValidatorForHierarchy,
        multipleParentValidator: MultipleParentValidator,
      ) => {
        return hierarchyValidationChainFactory.createHierarchyValidationChain(
          selfHierarchyValidator,
          circularHierarchyValidator,
          hierarchyDepthValidator,
          hierarchyConflictValidator,
          linkConflictValidatorForHierarchy,
          multipleParentValidator,
        );
      },
      inject: [
        HierarchyValidationChainFactory,
        SelfHierarchyValidator,
        CircularHierarchyValidator,
        HierarchyDepthValidator,
        HierarchyConflictValidatorNew,
        LinkConflictValidatorForHierarchy,
        MultipleParentValidator,
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
