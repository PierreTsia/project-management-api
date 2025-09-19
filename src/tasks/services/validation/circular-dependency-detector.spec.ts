import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../../entities/task-link.entity';
import { CircularDependencyDetector } from './circular-dependency-detector';

describe('CircularDependencyDetector', () => {
  let detector: CircularDependencyDetector;
  let taskLinkRepository: Repository<TaskLink>;

  const mockTaskLink: TaskLink = {
    id: 'link-123',
    projectId: 'project-123',
    sourceTaskId: 'task-123',
    targetTaskId: 'task-456',
    type: 'BLOCKS',
    createdAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircularDependencyDetector,
        {
          provide: getRepositoryToken(TaskLink),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    detector = module.get<CircularDependencyDetector>(
      CircularDependencyDetector,
    );
    taskLinkRepository = module.get<Repository<TaskLink>>(
      getRepositoryToken(TaskLink),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectCircularDependency', () => {
    it('should return no cycle when no existing links', async () => {
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await detector.detectCircularDependency(
        'task-123',
        'task-456',
        'BLOCKS',
      );

      expect(result).toEqual({ hasCycle: false });
      expect(taskLinkRepository.find).toHaveBeenCalledWith({
        where: [{ sourceTaskId: 'task-123' }, { targetTaskId: 'task-456' }],
      });
    });

    it('should return no cycle when no circular dependency exists', async () => {
      const existingLinks = [
        { ...mockTaskLink, sourceTaskId: 'task-456', targetTaskId: 'task-789' },
        { ...mockTaskLink, sourceTaskId: 'task-789', targetTaskId: 'task-101' },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(existingLinks);

      const result = await detector.detectCircularDependency(
        'task-123',
        'task-456',
        'BLOCKS',
      );

      expect(result).toEqual({ hasCycle: false });
    });

    it('should detect simple circular dependency', async () => {
      const existingLinks = [
        { ...mockTaskLink, sourceTaskId: 'task-456', targetTaskId: 'task-123' },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(existingLinks);

      const result = await detector.detectCircularDependency(
        'task-123',
        'task-456',
        'BLOCKS',
      );

      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath).toContain('task-123');
      expect(result.cyclePath).toContain('task-456');
      expect(result.reason).toContain('circular dependency');
    });

    it('should detect complex circular dependency', async () => {
      const existingLinks = [
        { ...mockTaskLink, sourceTaskId: 'task-456', targetTaskId: 'task-789' },
        { ...mockTaskLink, sourceTaskId: 'task-789', targetTaskId: 'task-101' },
        { ...mockTaskLink, sourceTaskId: 'task-101', targetTaskId: 'task-123' },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(existingLinks);

      const result = await detector.detectCircularDependency(
        'task-123',
        'task-456',
        'BLOCKS',
      );

      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath).toContain('task-123');
      expect(result.cyclePath).toContain('task-456');
      expect(result.cyclePath).toContain('task-789');
      expect(result.cyclePath).toContain('task-101');
    });

    it('should handle reverse link types correctly', async () => {
      const existingLinks = [
        {
          ...mockTaskLink,
          sourceTaskId: 'task-123',
          targetTaskId: 'task-456',
          type: 'IS_BLOCKED_BY',
        },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(existingLinks);

      const result = await detector.detectCircularDependency(
        'task-123',
        'task-456',
        'BLOCKS',
      );

      expect(result.hasCycle).toBe(true);
    });

    it('should handle different link types', async () => {
      const existingLinks = [
        {
          ...mockTaskLink,
          sourceTaskId: 'task-456',
          targetTaskId: 'task-123',
          type: 'RELATES_TO',
        },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(existingLinks);

      const result = await detector.detectCircularDependency(
        'task-123',
        'task-456',
        'DUPLICATES',
      );

      expect(result.hasCycle).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (taskLinkRepository.find as jest.Mock).mockRejectedValue(dbError);

      await expect(
        detector.detectCircularDependency('task-123', 'task-456', 'BLOCKS'),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('hasCircularDependency', () => {
    it('should return no cycle when task has no links', async () => {
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await detector.hasCircularDependency('task-123');

      expect(result).toEqual({ hasCycle: false });
      expect(taskLinkRepository.find).toHaveBeenCalledWith({
        where: [{ sourceTaskId: 'task-123' }, { targetTaskId: 'task-123' }],
      });
    });

    it('should detect circular dependency in existing links', async () => {
      const existingLinks = [
        { ...mockTaskLink, sourceTaskId: 'task-123', targetTaskId: 'task-456' },
        { ...mockTaskLink, sourceTaskId: 'task-456', targetTaskId: 'task-123' },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(existingLinks);

      const result = await detector.hasCircularDependency('task-123');

      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath).toContain('task-123');
      expect(result.cyclePath).toContain('task-456');
      expect(result.reason).toContain(
        'Task task-123 is involved in a circular dependency',
      );
    });

    it('should return no cycle when no circular dependency exists', async () => {
      const existingLinks = [
        { ...mockTaskLink, sourceTaskId: 'task-123', targetTaskId: 'task-456' },
        { ...mockTaskLink, sourceTaskId: 'task-456', targetTaskId: 'task-789' },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(existingLinks);

      const result = await detector.hasCircularDependency('task-123');

      expect(result).toEqual({ hasCycle: false });
    });
  });

  describe('Graph Building', () => {
    it('should build graph correctly for forward links', async () => {
      const existingLinks = [
        {
          ...mockTaskLink,
          sourceTaskId: 'task-123',
          targetTaskId: 'task-456',
          type: 'BLOCKS',
        },
        {
          ...mockTaskLink,
          sourceTaskId: 'task-456',
          targetTaskId: 'task-789',
          type: 'RELATES_TO',
        },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(existingLinks);

      const result = await detector.detectCircularDependency(
        'task-123',
        'task-456',
        'BLOCKS',
      );

      expect(result).toEqual({ hasCycle: false });
    });

    it('should build graph correctly for reverse links', async () => {
      const existingLinks = [
        {
          ...mockTaskLink,
          sourceTaskId: 'task-123',
          targetTaskId: 'task-456',
          type: 'IS_BLOCKED_BY',
        },
        {
          ...mockTaskLink,
          sourceTaskId: 'task-456',
          targetTaskId: 'task-789',
          type: 'IS_DUPLICATED_BY',
        },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(existingLinks);

      const result = await detector.detectCircularDependency(
        'task-123',
        'task-456',
        'IS_BLOCKED_BY',
      );

      expect(result).toEqual({ hasCycle: false });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cycle path', async () => {
      (taskLinkRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await detector.detectCircularDependency(
        'task-123',
        'task-456',
        'BLOCKS',
      );

      expect(result).toEqual({ hasCycle: false });
    });

    it('should handle single node graph', async () => {
      const existingLinks = [
        { ...mockTaskLink, sourceTaskId: 'task-123', targetTaskId: 'task-123' },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(existingLinks);

      const result = await detector.detectCircularDependency(
        'task-123',
        'task-123',
        'BLOCKS',
      );

      expect(result.hasCycle).toBe(true);
    });

    it('should handle disconnected components', async () => {
      const existingLinks = [
        { ...mockTaskLink, sourceTaskId: 'task-789', targetTaskId: 'task-101' },
        { ...mockTaskLink, sourceTaskId: 'task-101', targetTaskId: 'task-789' },
      ];
      (taskLinkRepository.find as jest.Mock).mockResolvedValue(existingLinks);

      const result = await detector.detectCircularDependency(
        'task-123',
        'task-456',
        'BLOCKS',
      );

      expect(result).toEqual({ hasCycle: false });
    });
  });
});
