import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../../entities/task-link.entity';
import { TaskRelationshipValidationChain } from './task-relationship-validation-chain';
import {
  SameProjectValidator,
  SelfLinkingValidator,
  LinkLimitValidator,
  CircularDependencyValidator,
  HierarchyConflictValidatorHandler,
} from './global-validators';
import { OneRelationshipPerPairValidator } from './one-relationship-per-pair-validator';
import {
  BlocksTypeValidator,
  DuplicatesTypeValidator,
} from './link-type-specific-validators';
import { CircularDependencyDetector } from './circular-dependency-detector';
import { HierarchyConflictValidator } from './hierarchy-conflict-validator';
import { Task } from '../../entities/task.entity';
import { TaskLinkType } from '../../enums/task-link-type.enum';

describe('TaskRelationshipValidationChain', () => {
  let validationChain: TaskRelationshipValidationChain;
  let sameProjectValidator: SameProjectValidator;
  let selfLinkingValidator: SelfLinkingValidator;
  let linkLimitValidator: LinkLimitValidator;
  let circularDependencyValidator: CircularDependencyValidator;
  let hierarchyConflictValidatorHandler: HierarchyConflictValidatorHandler;
  let oneRelationshipPerPairValidator: OneRelationshipPerPairValidator;
  let blocksTypeValidator: BlocksTypeValidator;
  let duplicatesTypeValidator: DuplicatesTypeValidator;
  let circularDependencyDetector: CircularDependencyDetector;
  let hierarchyConflictValidator: HierarchyConflictValidator;
  let taskLinkRepository: Repository<TaskLink>;

  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO' as any,
    priority: 'MEDIUM' as any,
    projectId: 'project-123',
    projectName: 'Test Project',
    assignee: {
      id: 'user-123',
      name: 'User 123',
      email: 'user123@example.com',
      bio: 'User 123 bio',
      dob: new Date(),
      phone: '1234567890',
      avatarUrl: 'https://example.com/avatar.jpg',
      isEmailConfirmed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      provider: 'local',
      canChangePassword: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  const mockTargetTask: Task = {
    ...mockTask,
    id: 'task-456',
    title: 'Target Task',
  } as any;

  const mockValidationRequest = {
    sourceTask: mockTask,
    targetTask: mockTargetTask,
    linkType: 'BLOCKS' as TaskLinkType,
    projectId: 'project-123',
  };

  beforeEach(async () => {
    const mockCircularDependencyDetector = {
      detectCircularDependency: jest.fn(),
    };

    const mockHierarchyConflictValidator = {
      validateHierarchyConflict: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskRelationshipValidationChain,
        SameProjectValidator,
        SelfLinkingValidator,
        {
          provide: LinkLimitValidator,
          useFactory: () => new LinkLimitValidator(20),
        },
        {
          provide: CircularDependencyDetector,
          useValue: mockCircularDependencyDetector,
        },
        CircularDependencyValidator,
        {
          provide: HierarchyConflictValidator,
          useValue: mockHierarchyConflictValidator,
        },
        HierarchyConflictValidatorHandler,
        OneRelationshipPerPairValidator,
        BlocksTypeValidator,
        DuplicatesTypeValidator,
        {
          provide: getRepositoryToken(TaskLink),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    validationChain = module.get<TaskRelationshipValidationChain>(
      TaskRelationshipValidationChain,
    );
    sameProjectValidator =
      module.get<SameProjectValidator>(SameProjectValidator);
    selfLinkingValidator =
      module.get<SelfLinkingValidator>(SelfLinkingValidator);
    linkLimitValidator = module.get<LinkLimitValidator>(LinkLimitValidator);
    circularDependencyValidator = module.get<CircularDependencyValidator>(
      CircularDependencyValidator,
    );
    hierarchyConflictValidatorHandler =
      module.get<HierarchyConflictValidatorHandler>(
        HierarchyConflictValidatorHandler,
      );
    oneRelationshipPerPairValidator =
      module.get<OneRelationshipPerPairValidator>(
        OneRelationshipPerPairValidator,
      );
    blocksTypeValidator = module.get<BlocksTypeValidator>(BlocksTypeValidator);
    duplicatesTypeValidator = module.get<DuplicatesTypeValidator>(
      DuplicatesTypeValidator,
    );
    circularDependencyDetector = module.get<CircularDependencyDetector>(
      CircularDependencyDetector,
    );
    hierarchyConflictValidator = module.get<HierarchyConflictValidator>(
      HierarchyConflictValidator,
    );
    taskLinkRepository = module.get<Repository<TaskLink>>(
      getRepositoryToken(TaskLink),
    );

    // Set up the validation chain
    sameProjectValidator
      .setNext(selfLinkingValidator)
      .setNext(oneRelationshipPerPairValidator)
      .setNext(linkLimitValidator)
      .setNext(circularDependencyValidator)
      .setNext(hierarchyConflictValidatorHandler);

    validationChain.setValidationChain(sameProjectValidator);
    validationChain.registerLinkValidator('BLOCKS', blocksTypeValidator);
    validationChain.registerLinkValidator(
      'DUPLICATES',
      duplicatesTypeValidator,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canCreateLink', () => {
    it('should validate successfully when all validators pass', async () => {
      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: false,
      });
      (
        hierarchyConflictValidator.validateHierarchyConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result = await validationChain.canCreateLink(mockValidationRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should fail when same project validation fails', async () => {
      const requestWithDifferentProject = {
        ...mockValidationRequest,
        sourceTask: { ...mockTask, projectId: 'different-project' },
      };

      const result = await validationChain.canCreateLink(
        requestWithDifferentProject,
      );

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.not_same_project',
      });
    });

    it('should fail when self linking validation fails', async () => {
      const selfLinkRequest = {
        ...mockValidationRequest,
        targetTask: mockTask, // Same as source
      };

      const result = await validationChain.canCreateLink(selfLinkRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.self_link',
      });
    });

    it('should fail when one relationship per pair validation fails', async () => {
      const existingLink = {
        id: 'link-123',
        projectId: 'project-123',
        sourceTaskId: 'task-123',
        targetTaskId: 'task-456',
        type: 'RELATES_TO',
        createdAt: new Date(),
      } as any;
      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(existingLink);

      const result = await validationChain.canCreateLink(mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.duplicate_relationship',
      });
    });

    it('should fail when circular dependency validation fails', async () => {
      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: true,
        reason: 'Circular dependency detected',
      });

      const result = await validationChain.canCreateLink(mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'Circular dependency detected',
      });
    });

    it('should fail when hierarchy conflict validation fails', async () => {
      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: false,
      });
      (
        hierarchyConflictValidator.validateHierarchyConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: true,
        reason: 'Hierarchy conflict detected',
      });

      const result = await validationChain.canCreateLink(mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'Hierarchy conflict detected',
      });
    });

    it('should apply type-specific validation for BLOCKS links', async () => {
      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: false,
      });
      (
        hierarchyConflictValidator.validateHierarchyConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result = await validationChain.canCreateLink(mockValidationRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should apply type-specific validation for DUPLICATES links', async () => {
      const duplicatesRequest = {
        ...mockValidationRequest,
        linkType: 'DUPLICATES' as TaskLinkType,
      };

      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: false,
      });
      (
        hierarchyConflictValidator.validateHierarchyConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result = await validationChain.canCreateLink(duplicatesRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should skip type-specific validation for RELATES_TO links', async () => {
      const relatesToRequest = {
        ...mockValidationRequest,
        linkType: 'RELATES_TO' as TaskLinkType,
      };

      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: false,
      });
      (
        hierarchyConflictValidator.validateHierarchyConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result = await validationChain.canCreateLink(relatesToRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should handle unknown link types gracefully', async () => {
      const unknownTypeRequest = {
        ...mockValidationRequest,
        linkType: 'UNKNOWN_TYPE' as TaskLinkType,
      };

      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: false,
      });
      (
        hierarchyConflictValidator.validateHierarchyConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result = await validationChain.canCreateLink(unknownTypeRequest);

      expect(result).toEqual({ valid: true });
    });
  });

  describe('Chain Order', () => {
    it('should execute validators in correct order', async () => {
      const requestWithDifferentProject = {
        ...mockValidationRequest,
        sourceTask: { ...mockTask, projectId: 'different-project' },
      };

      const result = await validationChain.canCreateLink(
        requestWithDifferentProject,
      );

      // Should fail at first validator (same project) and not continue
      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.not_same_project',
      });
    });

    it('should stop chain execution on first failure', async () => {
      const selfLinkRequest = {
        ...mockValidationRequest,
        targetTask: mockTask, // Same as source - should fail at self linking
      };

      const result = await validationChain.canCreateLink(selfLinkRequest);

      // Should fail at self linking validator and not continue to later validators
      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.self_link',
      });
    });
  });

  describe('Error Propagation', () => {
    it('should propagate errors from chain validators', async () => {
      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: true,
        reason: 'Custom circular dependency error',
      });

      const result = await validationChain.canCreateLink(mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'Custom circular dependency error',
      });
    });

    it('should propagate errors from type-specific validators', async () => {
      // Mock a type-specific validator that returns an error
      const mockBlocksValidator = {
        canCreate: jest.fn().mockReturnValue({
          valid: false,
          reason: 'Custom blocks validation error',
        }),
      };
      validationChain.registerLinkValidator(
        'BLOCKS',
        mockBlocksValidator as any,
      );

      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: false,
      });
      (
        hierarchyConflictValidator.validateHierarchyConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result = await validationChain.canCreateLink(mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'Custom blocks validation error',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing validation chain', async () => {
      const emptyChain = new TaskRelationshipValidationChain();
      emptyChain.registerLinkValidator('BLOCKS', blocksTypeValidator);

      const result = await emptyChain.canCreateLink(mockValidationRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should handle missing type-specific validator', async () => {
      const unknownTypeRequest = {
        ...mockValidationRequest,
        linkType: 'UNKNOWN_TYPE' as TaskLinkType,
      };

      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: false,
      });
      (
        hierarchyConflictValidator.validateHierarchyConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result = await validationChain.canCreateLink(unknownTypeRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (taskLinkRepository.findOne as jest.Mock).mockRejectedValue(dbError);

      await expect(
        validationChain.canCreateLink(mockValidationRequest),
      ).rejects.toThrow('Database connection failed');
    });
  });
});
