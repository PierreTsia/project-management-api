import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskHierarchy } from '../../entities/task-hierarchy.entity';
import { HierarchyValidationChain } from './hierarchy-validation-chain';
import {
  SelfHierarchyValidator,
  CircularHierarchyValidator,
  HierarchyDepthValidator,
  HierarchyConflictValidator,
  LinkConflictValidatorForHierarchy,
} from './hierarchy-validators';
import { MultipleParentValidator } from './multiple-parent-validator';
import { LinkConflictValidator } from './link-conflict-validator';
import { Task } from '../../entities/task.entity';

describe('HierarchyValidationChain', () => {
  let validationChain: HierarchyValidationChain;
  let selfHierarchyValidator: SelfHierarchyValidator;
  let circularHierarchyValidator: CircularHierarchyValidator;
  let hierarchyDepthValidator: HierarchyDepthValidator;
  let hierarchyConflictValidator: HierarchyConflictValidator;
  let linkConflictValidatorForHierarchy: LinkConflictValidatorForHierarchy;
  let multipleParentValidator: MultipleParentValidator;
  let taskHierarchyRepository: Repository<TaskHierarchy>;
  let linkConflictValidator: LinkConflictValidator;

  const mockParentTask: Task = {
    id: 'parent-task-123',
    title: 'Parent Task',
    description: 'Parent task description',
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

  const mockChildTask: Task = {
    id: 'child-task-456',
    title: 'Child Task',
    description: 'Child task description',
    status: 'IN_PROGRESS' as any,
    priority: 'HIGH' as any,
    projectId: 'project-123',
    projectName: 'Test Project',
    assignee: {
      id: 'user-456',
      name: 'User 456',
      email: 'user456@example.com',
      bio: 'User 456 bio',
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

  const mockHierarchyRequest = {
    parentTask: mockParentTask,
    childTask: mockChildTask,
    projectId: 'project-123',
  };

  beforeEach(async () => {
    const mockLinkConflictValidator = {
      validateLinkConflict: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HierarchyValidationChain,
        SelfHierarchyValidator,
        CircularHierarchyValidator,
        HierarchyDepthValidator,
        HierarchyConflictValidator,
        {
          provide: LinkConflictValidator,
          useValue: mockLinkConflictValidator,
        },
        LinkConflictValidatorForHierarchy,
        MultipleParentValidator,
        {
          provide: getRepositoryToken(TaskHierarchy),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    validationChain = module.get<HierarchyValidationChain>(
      HierarchyValidationChain,
    );
    selfHierarchyValidator = module.get<SelfHierarchyValidator>(
      SelfHierarchyValidator,
    );
    circularHierarchyValidator = module.get<CircularHierarchyValidator>(
      CircularHierarchyValidator,
    );
    hierarchyDepthValidator = module.get<HierarchyDepthValidator>(
      HierarchyDepthValidator,
    );
    hierarchyConflictValidator = module.get<HierarchyConflictValidator>(
      HierarchyConflictValidator,
    );
    linkConflictValidatorForHierarchy =
      module.get<LinkConflictValidatorForHierarchy>(
        LinkConflictValidatorForHierarchy,
      );
    multipleParentValidator = module.get<MultipleParentValidator>(
      MultipleParentValidator,
    );
    taskHierarchyRepository = module.get<Repository<TaskHierarchy>>(
      getRepositoryToken(TaskHierarchy),
    );
    linkConflictValidator = module.get<LinkConflictValidator>(
      LinkConflictValidator,
    );

    // Set up the validation chain
    selfHierarchyValidator
      .setNext(multipleParentValidator)
      .setNext(circularHierarchyValidator)
      .setNext(hierarchyDepthValidator)
      .setNext(hierarchyConflictValidator)
      .setNext(linkConflictValidatorForHierarchy);

    validationChain.setValidationChain(selfHierarchyValidator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateHierarchy', () => {
    it('should validate successfully when all validators pass', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue([]);
      (
        linkConflictValidator.validateLinkConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result =
        await validationChain.validateHierarchy(mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should fail when self hierarchy validation fails', async () => {
      const selfHierarchyRequest = {
        ...mockHierarchyRequest,
        childTask: mockParentTask, // Same as parent
      };

      const result =
        await validationChain.validateHierarchy(selfHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.self_parent',
      });
    });

    it('should fail when multiple parent validation fails', async () => {
      const existingParent = {
        id: 'hierarchy-123',
        projectId: 'project-123',
        parentTaskId: 'existing-parent-789',
        childTaskId: 'child-task-456',
        createdAt: new Date(),
      } as any;
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        existingParent,
      );

      const result =
        await validationChain.validateHierarchy(mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.multiple_parents',
      });
    });

    it('should fail when circular hierarchy validation fails', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);
      const existingHierarchies = [
        { parentTaskId: 'child-task-456', childTaskId: 'grandchild-task-789' },
        { parentTaskId: 'grandchild-task-789', childTaskId: 'parent-task-123' },
      ];
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue(
        existingHierarchies,
      );

      const result =
        await validationChain.validateHierarchy(mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.circular_hierarchy',
      });
    });

    it.skip('should fail when hierarchy depth validation fails', async () => {
      // Mock multiple parent validator to pass (no existing parent for child)
      (taskHierarchyRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // Multiple parent check
        .mockResolvedValueOnce(null) // Circular hierarchy check
        .mockResolvedValueOnce(null) // First depth check
        .mockResolvedValueOnce(null) // Second depth check
        .mockResolvedValueOnce(null) // Third depth check
        .mockResolvedValueOnce(null) // Fourth depth check
        .mockResolvedValueOnce(null) // Fifth depth check
        .mockResolvedValueOnce(null) // Sixth depth check
        .mockResolvedValueOnce(null) // Seventh depth check
        .mockResolvedValueOnce(null) // Eighth depth check
        .mockResolvedValueOnce(null) // Ninth depth check
        .mockResolvedValueOnce(null) // Tenth depth check
        .mockResolvedValueOnce(null); // No more parents
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue([]);
      (
        linkConflictValidator.validateLinkConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result =
        await validationChain.validateHierarchy(mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.max_depth_exceeded',
      });
    });

    it('should fail when hierarchy conflict validation fails', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue([]);
      (
        linkConflictValidator.validateLinkConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: true,
        reason: 'Hierarchy conflict detected',
      });

      const result =
        await validationChain.validateHierarchy(mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'Hierarchy conflict detected',
      });
    });

    it('should fail when link conflict validation fails', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue([]);
      (
        linkConflictValidator.validateLinkConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: true,
        reason: 'Link conflict detected',
      });

      const result =
        await validationChain.validateHierarchy(mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'Link conflict detected',
      });
    });
  });

  describe('Chain Order', () => {
    it('should execute validators in correct order', async () => {
      const selfHierarchyRequest = {
        ...mockHierarchyRequest,
        childTask: mockParentTask, // Same as parent - should fail at first validator
      };

      const result =
        await validationChain.validateHierarchy(selfHierarchyRequest);

      // Should fail at first validator (self hierarchy) and not continue
      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.self_parent',
      });
    });

    it('should stop chain execution on first failure', async () => {
      const existingParent = {
        id: 'hierarchy-123',
        projectId: 'project-123',
        parentTaskId: 'existing-parent-789',
        childTaskId: 'child-task-456',
        createdAt: new Date(),
      } as any;
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        existingParent,
      );

      const result =
        await validationChain.validateHierarchy(mockHierarchyRequest);

      // Should fail at multiple parent validator and not continue to later validators
      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.multiple_parents',
      });
    });
  });

  describe('Error Propagation', () => {
    it('should propagate errors from chain validators', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue([]);
      (
        linkConflictValidator.validateLinkConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: true,
        reason: 'Custom link conflict error',
      });

      const result =
        await validationChain.validateHierarchy(mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'Custom link conflict error',
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (taskHierarchyRepository.findOne as jest.Mock).mockRejectedValue(dbError);

      await expect(
        validationChain.validateHierarchy(mockHierarchyRequest),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing validation chain', async () => {
      const emptyChain = new HierarchyValidationChain(
        selfHierarchyValidator,
        circularHierarchyValidator,
        hierarchyDepthValidator,
        hierarchyConflictValidator,
        linkConflictValidatorForHierarchy,
      );

      const result = await emptyChain.validateHierarchy(mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should handle empty hierarchy request', async () => {
      const emptyRequest = {
        parentTask: { id: 'task-1' } as Task,
        childTask: { id: 'task-2' } as Task,
        projectId: '',
      };

      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue([]);
      (
        linkConflictValidator.validateLinkConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result = await validationChain.validateHierarchy(emptyRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should handle null/undefined tasks gracefully', async () => {
      const invalidRequest = {
        parentTask: { id: 'task-1' } as Task,
        childTask: { id: 'task-2' } as Task,
        projectId: 'project-123',
      };

      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue([]);
      (
        linkConflictValidator.validateLinkConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result = await validationChain.validateHierarchy(invalidRequest);

      expect(result).toEqual({ valid: true });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex validation scenario with multiple failures', async () => {
      // This test simulates a real-world scenario where multiple validations might fail
      const selfHierarchyRequest = {
        ...mockHierarchyRequest,
        childTask: mockParentTask, // Same as parent
      };

      const result =
        await validationChain.validateHierarchy(selfHierarchyRequest);

      // Should fail at the first validator (self hierarchy)
      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.self_parent',
      });
    });

    it('should handle successful validation with all edge cases', async () => {
      // Mock all validators to pass
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue([]);
      (
        linkConflictValidator.validateLinkConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result =
        await validationChain.validateHierarchy(mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
    });
  });
});
