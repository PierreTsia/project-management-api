import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskHierarchy } from '../../entities/task-hierarchy.entity';
import { MultipleParentValidator } from './multiple-parent-validator';
import { Task } from '../../entities/task.entity';

describe('MultipleParentValidator', () => {
  let validator: MultipleParentValidator;
  let taskHierarchyRepository: Repository<TaskHierarchy>;

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

  const mockExistingParent: TaskHierarchy = {
    id: 'hierarchy-123',
    projectId: 'project-123',
    parentTaskId: 'existing-parent-789',
    childTaskId: 'child-task-456',
    createdAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultipleParentValidator,
        {
          provide: getRepositoryToken(TaskHierarchy),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    validator = module.get<MultipleParentValidator>(MultipleParentValidator);
    taskHierarchyRepository = module.get<Repository<TaskHierarchy>>(
      getRepositoryToken(TaskHierarchy),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should validate successfully when child has no existing parent', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await validator['validate'](mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
      expect(taskHierarchyRepository.findOne).toHaveBeenCalledWith({
        where: {
          projectId: 'project-123',
          childTaskId: 'child-task-456',
        },
      });
    });

    it('should fail when child already has a parent', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        mockExistingParent,
      );

      const result = await validator['validate'](mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.multiple_parents',
      });
    });

    it('should check correct project ID', async () => {
      const requestWithDifferentProject = {
        ...mockHierarchyRequest,
        projectId: 'different-project',
      };

      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      await validator['validate'](requestWithDifferentProject);

      expect(taskHierarchyRepository.findOne).toHaveBeenCalledWith({
        where: {
          projectId: 'different-project',
          childTaskId: 'child-task-456',
        },
      });
    });

    it('should check correct child task ID', async () => {
      const requestWithDifferentChild = {
        ...mockHierarchyRequest,
        childTask: { ...mockChildTask, id: 'different-child-789' },
      };

      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      await validator['validate'](requestWithDifferentChild);

      expect(taskHierarchyRepository.findOne).toHaveBeenCalledWith({
        where: {
          projectId: 'project-123',
          childTaskId: 'different-child-789',
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (taskHierarchyRepository.findOne as jest.Mock).mockRejectedValue(dbError);

      await expect(validator['validate'](mockHierarchyRequest)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle edge case with same parent and child', async () => {
      const selfParentRequest = {
        ...mockHierarchyRequest,
        parentTask: mockChildTask, // Same as child
      };

      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await validator['validate'](selfParentRequest);

      expect(result).toEqual({ valid: true });
      expect(taskHierarchyRepository.findOne).toHaveBeenCalledWith({
        where: {
          projectId: 'project-123',
          childTaskId: 'child-task-456',
        },
      });
    });
  });

  describe('Chain of Responsibility', () => {
    it('should chain to next validator on success', async () => {
      const nextValidator = {
        handle: jest.fn().mockResolvedValue({ valid: true }),
      };

      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);
      validator.setNext(nextValidator as any);

      const result = await validator.handle(mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
      expect(nextValidator.handle).toHaveBeenCalledWith(mockHierarchyRequest);
    });

    it('should stop chain on failure', async () => {
      const nextValidator = {
        handle: jest.fn().mockResolvedValue({ valid: true }),
      };

      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        mockExistingParent,
      );
      validator.setNext(nextValidator as any);

      const result = await validator.handle(mockHierarchyRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.multiple_parents',
      });
      expect(nextValidator.handle).not.toHaveBeenCalled();
    });

    it('should return valid when no next validator', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await validator.handle(mockHierarchyRequest);

      expect(result).toEqual({ valid: true });
    });
  });

  describe('Business Logic Validation', () => {
    it('should enforce single parent rule', async () => {
      // First parent should be allowed
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);
      const result1 = await validator['validate'](mockHierarchyRequest);
      expect(result1).toEqual({ valid: true });

      // Second parent should be rejected
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        mockExistingParent,
      );
      const result2 = await validator['validate'](mockHierarchyRequest);
      expect(result2).toEqual({
        valid: false,
        reason: 'errors.task_hierarchy.multiple_parents',
      });
    });

    it('should allow different children to have the same parent', async () => {
      const differentChildRequest = {
        ...mockHierarchyRequest,
        childTask: { ...mockChildTask, id: 'different-child-789' },
      };

      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await validator['validate'](differentChildRequest);

      expect(result).toEqual({ valid: true });
    });
  });
});
