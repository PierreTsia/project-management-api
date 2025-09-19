import { Test, TestingModule } from '@nestjs/testing';

import {
  SameProjectValidator,
  SelfLinkingValidator,
  LinkLimitValidator,
  CircularDependencyValidator,
  HierarchyConflictValidatorHandler,
} from './global-validators';
import { CircularDependencyDetector } from './circular-dependency-detector';
import { HierarchyConflictValidator } from './hierarchy-conflict-validator';
import { Task } from '../../entities/task.entity';
import { TaskLinkType } from '../../enums/task-link-type.enum';

describe('Global Validators', () => {
  let module: TestingModule;
  let sameProjectValidator: SameProjectValidator;
  let selfLinkingValidator: SelfLinkingValidator;
  let linkLimitValidator: LinkLimitValidator;
  let circularDependencyValidator: CircularDependencyValidator;
  let hierarchyConflictValidatorHandler: HierarchyConflictValidatorHandler;
  let circularDependencyDetector: CircularDependencyDetector;
  let hierarchyConflictValidator: HierarchyConflictValidator;

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

    module = await Test.createTestingModule({
      providers: [
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
      ],
    }).compile();

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
    circularDependencyDetector = module.get<CircularDependencyDetector>(
      CircularDependencyDetector,
    );
    hierarchyConflictValidator = module.get<HierarchyConflictValidator>(
      HierarchyConflictValidator,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('SameProjectValidator', () => {
    it('should validate successfully when tasks are in the same project', () => {
      const result = sameProjectValidator['validate'](mockValidationRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should fail when source task is in different project', () => {
      const requestWithDifferentProject = {
        ...mockValidationRequest,
        sourceTask: { ...mockTask, projectId: 'different-project' },
      };

      const result = sameProjectValidator['validate'](
        requestWithDifferentProject,
      );

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.not_same_project',
      });
    });

    it('should fail when target task is in different project', () => {
      const requestWithDifferentProject = {
        ...mockValidationRequest,
        targetTask: { ...mockTargetTask, projectId: 'different-project' },
      };

      const result = sameProjectValidator['validate'](
        requestWithDifferentProject,
      );

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.not_same_project',
      });
    });

    it('should fail when projectId does not match task projectId', () => {
      const requestWithDifferentProject = {
        ...mockValidationRequest,
        projectId: 'different-project',
      };

      const result = sameProjectValidator['validate'](
        requestWithDifferentProject,
      );

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.not_same_project',
      });
    });
  });

  describe('SelfLinkingValidator', () => {
    it('should validate successfully when tasks are different', () => {
      const result = selfLinkingValidator['validate'](mockValidationRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should fail when source and target tasks are the same', () => {
      const selfLinkRequest = {
        ...mockValidationRequest,
        targetTask: mockTask, // Same as source task
      };

      const result = selfLinkingValidator['validate'](selfLinkRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.self_link',
      });
    });
  });

  describe('LinkLimitValidator', () => {
    it('should always return valid (counting happens in service)', () => {
      const result = linkLimitValidator['validate'](mockValidationRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should be instantiated with correct max links limit', () => {
      expect(linkLimitValidator['maxLinksPerTask']).toBe(20);
    });
  });

  describe('CircularDependencyValidator', () => {
    it('should validate successfully when no circular dependency exists', async () => {
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: false,
      });

      const result = await circularDependencyValidator['validate'](
        mockValidationRequest,
      );

      expect(result).toEqual({ valid: true });
      expect(
        circularDependencyDetector.detectCircularDependency,
      ).toHaveBeenCalledWith('task-123', 'task-456', 'BLOCKS');
    });

    it('should fail when circular dependency is detected', async () => {
      const cycleReason =
        'Creating this link would create a circular dependency: task-456 → task-123';
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: true,
        reason: cycleReason,
      });

      const result = await circularDependencyValidator['validate'](
        mockValidationRequest,
      );

      expect(result).toEqual({
        valid: false,
        reason: cycleReason,
      });
    });

    it('should fail with default reason when no specific reason provided', async () => {
      (
        circularDependencyDetector.detectCircularDependency as jest.Mock
      ).mockResolvedValue({
        hasCycle: true,
      });

      const result = await circularDependencyValidator['validate'](
        mockValidationRequest,
      );

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.circular_dependency',
      });
    });
  });

  describe('HierarchyConflictValidatorHandler', () => {
    it('should validate successfully when no hierarchy conflict exists', async () => {
      (
        hierarchyConflictValidator.validateHierarchyConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result = await hierarchyConflictValidatorHandler['validate'](
        mockValidationRequest,
      );

      expect(result).toEqual({ valid: true });
      expect(
        hierarchyConflictValidator.validateHierarchyConflict,
      ).toHaveBeenCalledWith('task-123', 'task-456', 'BLOCKS');
    });

    it('should fail when hierarchy conflict is detected', async () => {
      const conflictReason = 'A parent task cannot block its child task.';
      (
        hierarchyConflictValidator.validateHierarchyConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: true,
        reason: conflictReason,
      });

      const result = await hierarchyConflictValidatorHandler['validate'](
        mockValidationRequest,
      );

      expect(result).toEqual({
        valid: false,
        reason: conflictReason,
      });
    });

    it('should fail with default reason when no specific reason provided', async () => {
      (
        hierarchyConflictValidator.validateHierarchyConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: true,
      });

      const result = await hierarchyConflictValidatorHandler['validate'](
        mockValidationRequest,
      );

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.hierarchy_conflict',
      });
    });
  });

  describe('Chain of Responsibility', () => {
    it('should chain validators correctly', async () => {
      const nextValidator = {
        handle: jest.fn().mockResolvedValue({ valid: true }),
      };

      sameProjectValidator.setNext(nextValidator as any);

      const result = await sameProjectValidator.handle(mockValidationRequest);

      expect(result).toEqual({ valid: true });
      expect(nextValidator.handle).toHaveBeenCalledWith(mockValidationRequest);
    });

    it('should stop chain on first failure', async () => {
      const nextValidator = {
        handle: jest.fn().mockResolvedValue({ valid: true }),
      };

      const requestWithDifferentProject = {
        ...mockValidationRequest,
        sourceTask: { ...mockTask, projectId: 'different-project' },
      };

      sameProjectValidator.setNext(nextValidator as any);

      const result = await sameProjectValidator.handle(
        requestWithDifferentProject,
      );

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.not_same_project',
      });
      expect(nextValidator.handle).not.toHaveBeenCalled();
    });

    it('should return valid when no next validator', async () => {
      const result = await sameProjectValidator.handle(mockValidationRequest);

      expect(result).toEqual({ valid: true });
    });
  });
});
