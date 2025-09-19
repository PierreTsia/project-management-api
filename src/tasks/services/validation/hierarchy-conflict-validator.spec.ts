import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskHierarchy } from '../../entities/task-hierarchy.entity';
import { HierarchyConflictValidator } from './hierarchy-conflict-validator';
import { TaskLinkType } from '../../enums/task-link-type.enum';

describe('HierarchyConflictValidator', () => {
  let validator: HierarchyConflictValidator;
  let taskHierarchyRepository: Repository<TaskHierarchy>;

  const mockTaskHierarchy: TaskHierarchy = {
    id: 'hierarchy-123',
    projectId: 'project-123',
    parentTaskId: 'parent-task-123',
    childTaskId: 'child-task-456',
    createdAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HierarchyConflictValidator,
        {
          provide: getRepositoryToken(TaskHierarchy),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    validator = module.get<HierarchyConflictValidator>(
      HierarchyConflictValidator,
    );
    taskHierarchyRepository = module.get<Repository<TaskHierarchy>>(
      getRepositoryToken(TaskHierarchy),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateHierarchyConflict', () => {
    it('should return no conflict when no hierarchy relationship exists', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await validator.validateHierarchyConflict(
        'task-123',
        'task-456',
        'BLOCKS',
      );

      expect(result).toEqual({ hasConflict: false });
    });

    it('should detect conflict for BLOCKS link when source is parent of target', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        mockTaskHierarchy,
      );

      const result = await validator.validateHierarchyConflict(
        'parent-task-123',
        'child-task-456',
        'BLOCKS',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'A parent task cannot block its child task. Child tasks should be able to complete independently.',
      });
    });

    it('should detect conflict for IS_BLOCKED_BY link when target is parent of source', async () => {
      const reverseHierarchy = {
        ...mockTaskHierarchy,
        parentTaskId: 'child-task-456',
        childTaskId: 'parent-task-123',
      };
      (taskHierarchyRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // First check: source as parent
        .mockResolvedValueOnce(reverseHierarchy); // Second check: target as parent

      const result = await validator.validateHierarchyConflict(
        'parent-task-123',
        'child-task-456',
        'IS_BLOCKED_BY',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'A child task cannot be blocked by its parent task. Parent tasks should not block their children.',
      });
    });

    it('should detect conflict for DUPLICATES link in hierarchy', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        mockTaskHierarchy,
      );

      const result = await validator.validateHierarchyConflict(
        'parent-task-123',
        'child-task-456',
        'DUPLICATES',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'Tasks in a parent-child relationship cannot be duplicates of each other.',
      });
    });

    it('should detect conflict for IS_DUPLICATED_BY link in hierarchy', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        mockTaskHierarchy,
      );

      const result = await validator.validateHierarchyConflict(
        'parent-task-123',
        'child-task-456',
        'IS_DUPLICATED_BY',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'Tasks in a parent-child relationship cannot be duplicates of each other.',
      });
    });

    it('should detect conflict for SPLITS_TO link when source is parent of target', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        mockTaskHierarchy,
      );

      const result = await validator.validateHierarchyConflict(
        'parent-task-123',
        'child-task-456',
        'SPLITS_TO',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'A parent task cannot split to its child task. Child tasks are already subdivisions of the parent.',
      });
    });

    it('should detect conflict for SPLITS_FROM link when target is parent of source', async () => {
      const reverseHierarchy = {
        ...mockTaskHierarchy,
        parentTaskId: 'child-task-456',
        childTaskId: 'parent-task-123',
      };
      (taskHierarchyRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // First check: source as parent
        .mockResolvedValueOnce(reverseHierarchy); // Second check: target as parent

      const result = await validator.validateHierarchyConflict(
        'parent-task-123',
        'child-task-456',
        'SPLITS_FROM',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'A child task cannot split from its parent task. Parent tasks are already the main task.',
      });
    });

    it('should allow RELATES_TO link in hierarchy', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        mockTaskHierarchy,
      );

      const result = await validator.validateHierarchyConflict(
        'parent-task-123',
        'child-task-456',
        'RELATES_TO',
      );

      expect(result).toEqual({ hasConflict: false });
    });

    it('should check both hierarchy directions', async () => {
      (taskHierarchyRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // First check: source as parent
        .mockResolvedValueOnce(mockTaskHierarchy); // Second check: target as parent

      await validator.validateHierarchyConflict(
        'parent-task-123',
        'child-task-456',
        'BLOCKS',
      );

      expect(taskHierarchyRepository.findOne).toHaveBeenCalledTimes(2);
      expect(taskHierarchyRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: {
          parentTaskId: 'parent-task-123',
          childTaskId: 'child-task-456',
        },
      });
      expect(taskHierarchyRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          parentTaskId: 'child-task-456',
          childTaskId: 'parent-task-123',
        },
      });
    });
  });

  describe('canLinkTasks', () => {
    it('should delegate to validateHierarchyConflict', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await validator.canLinkTasks(
        'task-123',
        'task-456',
        'BLOCKS',
      );

      expect(result).toEqual({ hasConflict: false });
    });
  });

  describe('getHierarchyConflicts', () => {
    it('should return hierarchy conflicts for a task', async () => {
      const mockAsParent = [
        { childTaskId: 'child-1' },
        { childTaskId: 'child-2' },
      ];
      const mockAsChild = [
        { parentTaskId: 'parent-1' },
        { parentTaskId: 'parent-2' },
      ];

      (taskHierarchyRepository.find as jest.Mock)
        .mockResolvedValueOnce(mockAsParent)
        .mockResolvedValueOnce(mockAsChild);

      const result = await validator.getHierarchyConflicts('task-123');

      expect(result).toEqual({
        asParent: ['child-1', 'child-2'],
        asChild: ['parent-1', 'parent-2'],
      });

      expect(taskHierarchyRepository.find).toHaveBeenCalledTimes(2);
      expect(taskHierarchyRepository.find).toHaveBeenNthCalledWith(1, {
        where: { parentTaskId: 'task-123' },
        select: ['childTaskId'],
      });
      expect(taskHierarchyRepository.find).toHaveBeenNthCalledWith(2, {
        where: { childTaskId: 'task-123' },
        select: ['parentTaskId'],
      });
    });

    it('should return empty arrays when no hierarchy exists', async () => {
      (taskHierarchyRepository.find as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await validator.getHierarchyConflicts('task-123');

      expect(result).toEqual({
        asParent: [],
        asChild: [],
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (taskHierarchyRepository.findOne as jest.Mock).mockRejectedValue(dbError);

      await expect(
        validator.validateHierarchyConflict('task-123', 'task-456', 'BLOCKS'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle unknown link types', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(
        mockTaskHierarchy,
      );

      const result = await validator.validateHierarchyConflict(
        'parent-task-123',
        'child-task-456',
        'UNKNOWN_TYPE' as TaskLinkType,
      );

      expect(result).toEqual({ hasConflict: false });
    });

    it('should handle same task IDs', async () => {
      (taskHierarchyRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await validator.validateHierarchyConflict(
        'task-123',
        'task-123',
        'BLOCKS',
      );

      expect(result).toEqual({ hasConflict: false });
    });
  });
});
