import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskHierarchy } from '../../entities/task-hierarchy.entity';
import {
  SelfHierarchyValidator,
  CircularHierarchyValidator,
  HierarchyDepthValidator,
  HierarchyConflictValidator,
  LinkConflictValidatorForHierarchy,
} from './hierarchy-validators';
import { LinkConflictValidator } from './link-conflict-validator';
import { Task } from '../../entities/task.entity';

describe('Hierarchy Validators', () => {
  let module: TestingModule;
  let selfHierarchyValidator: SelfHierarchyValidator;
  let circularHierarchyValidator: CircularHierarchyValidator;
  let hierarchyDepthValidator: HierarchyDepthValidator;
  let hierarchyConflictValidator: HierarchyConflictValidator;
  let linkConflictValidatorForHierarchy: LinkConflictValidatorForHierarchy;
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

  const mockTaskHierarchy: TaskHierarchy = {
    id: 'hierarchy-123',
    projectId: 'project-123',
    parentTaskId: 'parent-task-123',
    childTaskId: 'child-task-456',
    createdAt: new Date(),
  } as any;

  beforeEach(async () => {
    const mockLinkConflictValidator = {
      validateLinkConflict: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        SelfHierarchyValidator,
        CircularHierarchyValidator,
        HierarchyDepthValidator,
        HierarchyConflictValidator,
        {
          provide: LinkConflictValidator,
          useValue: mockLinkConflictValidator,
        },
        LinkConflictValidatorForHierarchy,
        {
          provide: getRepositoryToken(TaskHierarchy),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

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
    taskHierarchyRepository = module.get<Repository<TaskHierarchy>>(
      getRepositoryToken(TaskHierarchy),
    );
    linkConflictValidator = module.get<LinkConflictValidator>(
      LinkConflictValidator,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('SelfHierarchyValidator', () => {
    it('should validate successfully when parent and child are different tasks', async () => {
      const result =
        await selfHierarchyValidator['validate'](mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should fail when parent and child are the same task', async () => {
      const selfHierarchyRequest = {
        ...mockHierarchyRequest,
        childTask: mockParentTask, // Same as parent
      };

      const result =
        await selfHierarchyValidator['validate'](selfHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.self_parent',
      });
    });
  });

  describe('CircularHierarchyValidator', () => {
    it('should validate successfully when no circular hierarchy would be created', async () => {
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue([]);

      const result =
        await circularHierarchyValidator['validate'](mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should fail when circular hierarchy would be created', async () => {
      // Mock existing hierarchy: child -> grandchild -> parent
      const existingHierarchies = [
        { parentTaskId: 'child-task-456', childTaskId: 'grandchild-task-789' },
        { parentTaskId: 'grandchild-task-789', childTaskId: 'parent-task-123' },
      ];
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue(
        existingHierarchies,
      );

      const result =
        await circularHierarchyValidator['validate'](mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.circular_hierarchy',
      });
    });

    it('should handle complex circular dependencies', async () => {
      // Mock complex hierarchy with multiple levels
      const existingHierarchies = [
        { parentTaskId: 'child-task-456', childTaskId: 'level2-task' },
        { parentTaskId: 'level2-task', childTaskId: 'level3-task' },
        { parentTaskId: 'level3-task', childTaskId: 'parent-task-123' },
      ];
      (taskHierarchyRepository.find as jest.Mock).mockResolvedValue(
        existingHierarchies,
      );

      const result =
        await circularHierarchyValidator['validate'](mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.circular_hierarchy',
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (taskHierarchyRepository.find as jest.Mock).mockRejectedValue(dbError);

      await expect(
        circularHierarchyValidator['validate'](mockHierarchyRequest),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('HierarchyDepthValidator', () => {
    it('should validate successfully when depth is within limits', async () => {
      // Mock depth calculation returning 5 (less than MAX_DEPTH of 10)
      (taskHierarchyRepository.findOne as jest.Mock)
        .mockResolvedValueOnce({ parentTaskId: 'level1-task' })
        .mockResolvedValueOnce({ parentTaskId: 'level2-task' })
        .mockResolvedValueOnce({ parentTaskId: 'level3-task' })
        .mockResolvedValueOnce({ parentTaskId: 'level4-task' })
        .mockResolvedValueOnce({ parentTaskId: 'level5-task' })
        .mockResolvedValueOnce(null); // No more parents

      const result =
        await hierarchyDepthValidator['validate'](mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should fail when depth exceeds maximum limit', async () => {
      // Mock depth calculation returning 10 (equal to MAX_DEPTH)
      const mockParents = Array.from({ length: 10 }, (_, i) => ({
        parentTaskId: `level${i + 1}-task`,
      }));
      mockParents.forEach((parent) => {
        (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValueOnce(
          parent,
        );
      });
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValueOnce(
        null,
      ); // No more parents

      const result =
        await hierarchyDepthValidator['validate'](mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.max_depth_exceeded',
      });
    });

    it('should handle no existing hierarchy (depth 0)', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result =
        await hierarchyDepthValidator['validate'](mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (taskHierarchyRepository.findOne as jest.Mock).mockRejectedValue(dbError);

      await expect(
        hierarchyDepthValidator['validate'](mockHierarchyRequest),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('HierarchyConflictValidator', () => {
    it('should validate successfully when no existing hierarchy exists', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result =
        await hierarchyConflictValidator['validate'](mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should fail when hierarchy already exists (parent -> child)', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        mockTaskHierarchy,
      );

      const result =
        await hierarchyConflictValidator['validate'](mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.already_exists',
      });
    });

    it('should fail when hierarchy already exists (child -> parent)', async () => {
      const reverseHierarchy = {
        ...mockTaskHierarchy,
        parentTaskId: 'child-task-456',
        childTaskId: 'parent-task-123',
      };
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        reverseHierarchy,
      );

      const result =
        await hierarchyConflictValidator['validate'](mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.already_exists',
      });
    });

    it('should check both directions for existing hierarchy', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      await hierarchyConflictValidator['validate'](mockHierarchyRequest);

      expect(taskHierarchyRepository.findOne).toHaveBeenCalledWith({
        where: [
          {
            parentTaskId: 'parent-task-123',
            childTaskId: 'child-task-456',
          },
          {
            parentTaskId: 'child-task-456',
            childTaskId: 'parent-task-123',
          },
        ],
      });
    });
  });

  describe('LinkConflictValidatorForHierarchy', () => {
    it('should validate successfully when no link conflicts exist', async () => {
      (
        linkConflictValidator.validateLinkConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: false,
      });

      const result =
        await linkConflictValidatorForHierarchy['validate'](
          mockHierarchyRequest,
        );

      expect(result).toEqual({ valid: true });
      expect(linkConflictValidator.validateLinkConflict).toHaveBeenCalledWith(
        'parent-task-123',
        'child-task-456',
      );
    });

    it('should fail when link conflicts exist', async () => {
      const conflictReason = 'A parent task cannot block its child task.';
      (
        linkConflictValidator.validateLinkConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: true,
        reason: conflictReason,
      });

      const result =
        await linkConflictValidatorForHierarchy['validate'](
          mockHierarchyRequest,
        );

      expect(result).toEqual({
        valid: false,
        reason: conflictReason,
      });
    });

    it('should fail with default reason when no specific reason provided', async () => {
      (
        linkConflictValidator.validateLinkConflict as jest.Mock
      ).mockResolvedValue({
        hasConflict: true,
      });

      const result =
        await linkConflictValidatorForHierarchy['validate'](
          mockHierarchyRequest,
        );

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.link_conflict',
      });
    });
  });

  describe('Chain of Responsibility', () => {
    it('should chain validators correctly', async () => {
      const nextValidator = {
        handle: jest.fn().mockResolvedValue({ valid: true }),
      };

      selfHierarchyValidator.setNext(nextValidator as any);

      const result = await selfHierarchyValidator.handle(mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
      expect(nextValidator.handle).toHaveBeenCalledWith(mockHierarchyRequest);
    });

    it('should stop chain on first failure', async () => {
      const nextValidator = {
        handle: jest.fn().mockResolvedValue({ valid: true }),
      };

      const selfHierarchyRequest = {
        ...mockHierarchyRequest,
        childTask: mockParentTask, // Same as parent - should fail
      };

      selfHierarchyValidator.setNext(nextValidator as any);

      const result = await selfHierarchyValidator.handle(selfHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.self_parent',
      });
      expect(nextValidator.handle).not.toHaveBeenCalled();
    });

    it('should return valid when no next validator', async () => {
      const result = await selfHierarchyValidator.handle(mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
    });
  });
});
