import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../../entities/task-link.entity';
import { LinkConflictValidator } from './link-conflict-validator';

describe('LinkConflictValidator', () => {
  let validator: LinkConflictValidator;
  let taskLinkRepository: Repository<TaskLink>;

  const mockTaskLink: TaskLink = {
    id: 'link-123',
    projectId: 'project-123',
    sourceTaskId: 'parent-task-123',
    targetTaskId: 'child-task-456',
    type: 'BLOCKS',
    createdAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkConflictValidator,
        {
          provide: getRepositoryToken(TaskLink),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    validator = module.get<LinkConflictValidator>(LinkConflictValidator);
    taskLinkRepository = module.get<Repository<TaskLink>>(
      getRepositoryToken(TaskLink),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateLinkConflict', () => {
    it('should return no conflict when no existing links', async () => {
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({ hasConflict: false });
      expect(taskLinkRepository.find).toHaveBeenCalledWith({
        where: [
          { sourceTaskId: 'parent-task-123', targetTaskId: 'child-task-456' },
          { sourceTaskId: 'child-task-456', targetTaskId: 'parent-task-123' },
        ],
      });
    });

    it('should detect conflict for BLOCKS link (parent -> child)', async () => {
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([mockTaskLink]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'A parent task cannot block its child task. Child tasks should be able to complete independently.',
      });
    });

    it('should detect conflict for IS_BLOCKED_BY link (child -> parent)', async () => {
      const reverseLink = {
        ...mockTaskLink,
        sourceTaskId: 'child-task-456',
        targetTaskId: 'parent-task-123',
        type: 'IS_BLOCKED_BY',
      };
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([reverseLink]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'A child task cannot be blocked by its parent task. Parent tasks should not block their children.',
      });
    });

    it('should detect conflict for DUPLICATES link', async () => {
      const duplicatesLink = {
        ...mockTaskLink,
        type: 'DUPLICATES',
      };
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([
        duplicatesLink,
      ]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'Tasks in a parent-child relationship cannot be duplicates of each other.',
      });
    });

    it('should detect conflict for IS_DUPLICATED_BY link', async () => {
      const duplicatedByLink = {
        ...mockTaskLink,
        type: 'IS_DUPLICATED_BY',
      };
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([
        duplicatedByLink,
      ]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'Tasks in a parent-child relationship cannot be duplicates of each other.',
      });
    });

    it('should detect conflict for SPLITS_TO link (parent -> child)', async () => {
      const splitsToLink = {
        ...mockTaskLink,
        type: 'SPLITS_TO',
      };
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([splitsToLink]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'A parent task cannot split to its child task. Child tasks are already subdivisions of the parent.',
      });
    });

    it('should detect conflict for SPLITS_FROM link (child -> parent)', async () => {
      const splitsFromLink = {
        ...mockTaskLink,
        sourceTaskId: 'child-task-456',
        targetTaskId: 'parent-task-123',
        type: 'SPLITS_FROM',
      };
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([
        splitsFromLink,
      ]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'A child task cannot split from its parent task. Parent tasks are already the main task.',
      });
    });

    it('should detect conflict for RELATES_TO link', async () => {
      const relatesToLink = {
        ...mockTaskLink,
        type: 'RELATES_TO',
      };
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([relatesToLink]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'Tasks with existing relationships cannot be in a parent-child hierarchy. Remove the existing relationship first.',
      });
    });

    it('should handle multiple conflicting links', async () => {
      const conflictingLinks = [
        { ...mockTaskLink, type: 'BLOCKS' },
        { ...mockTaskLink, type: 'DUPLICATES' },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(
        conflictingLinks,
      );

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({
        hasConflict: true,
        reason:
          'A parent task cannot block its child task. Child tasks should be able to complete independently.',
      });
    });

    it('should handle non-conflicting links', async () => {
      const nonConflictingLink = {
        ...mockTaskLink,
        sourceTaskId: 'other-task-789',
        targetTaskId: 'another-task-101',
      };
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([
        nonConflictingLink,
      ]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({ hasConflict: false });
    });
  });

  describe('Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (taskLinkRepository.find as jest.Mock).mockRejectedValue(dbError);

      await expect(
        validator.validateLinkConflict('parent-task-123', 'child-task-456'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle same task IDs', async () => {
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await validator.validateLinkConflict(
        'task-123',
        'task-123',
      );

      expect(result).toEqual({ hasConflict: false });
    });

    it('should handle unknown link types', async () => {
      const unknownTypeLink = {
        ...mockTaskLink,
        type: 'UNKNOWN_TYPE' as any,
      };
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([
        unknownTypeLink,
      ]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({ hasConflict: false });
    });

    it('should handle empty link array', async () => {
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      expect(result).toEqual({ hasConflict: false });
    });
  });

  describe('Link Direction Handling', () => {
    it('should check both link directions', async () => {
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([]);

      await validator.validateLinkConflict('parent-task-123', 'child-task-456');

      expect(taskLinkRepository.find).toHaveBeenCalledWith({
        where: [
          { sourceTaskId: 'parent-task-123', targetTaskId: 'child-task-456' },
          { sourceTaskId: 'child-task-456', targetTaskId: 'parent-task-123' },
        ],
      });
    });

    it('should handle reverse direction links correctly', async () => {
      const reverseLink = {
        ...mockTaskLink,
        sourceTaskId: 'child-task-456',
        targetTaskId: 'parent-task-123',
        type: 'BLOCKS',
      };
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([reverseLink]);

      const result = await validator.validateLinkConflict(
        'parent-task-123',
        'child-task-456',
      );

      // This should not conflict because child -> parent BLOCKS is allowed
      expect(result).toEqual({ hasConflict: false });
    });
  });
});
