import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkLimitValidator } from './link-limit-validator';
import { TaskLink } from '../../entities/task-link.entity';
import { ValidationRequest } from './task-relationship-validation-chain';
import { TASK_LINK_LIMIT } from '../../tasks.module';
import { Task } from '../../entities/task.entity';
import { TaskStatus } from '../../enums/task-status.enum';
import { TaskPriority } from '../../enums/task-priority.enum';

describe('LinkLimitValidator', () => {
  let validator: LinkLimitValidator;
  let taskLinkRepository: Repository<TaskLink>;

  const mockTask: Partial<Task> = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date(),
    projectId: 'project-123',
    assigneeId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTargetTask: Partial<Task> = {
    id: 'task-456',
    title: 'Target Task',
    description: 'Target Description',
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    dueDate: new Date(),
    projectId: 'project-123',
    assigneeId: 'user-456',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockValidationRequest: ValidationRequest = {
    sourceTask: mockTask as Task,
    targetTask: mockTargetTask as Task,
    linkType: 'BLOCKS',
    projectId: 'project-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkLimitValidator,
        {
          provide: getRepositoryToken(TaskLink),
          useValue: {
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    validator = module.get<LinkLimitValidator>(LinkLimitValidator);
    taskLinkRepository = module.get<Repository<TaskLink>>(
      getRepositoryToken(TaskLink),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return valid when link count is below limit', async () => {
      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(10); // Below limit

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({ valid: true });
      expect(taskLinkRepository.count).toHaveBeenCalledWith({
        where: [
          { sourceTaskId: 'task-123' },
          { targetTaskId: 'task-123' },
          { sourceTaskId: 'task-456' },
          { targetTaskId: 'task-456' },
        ],
      });
    });

    it('should return invalid when link count is exactly at limit', async () => {
      jest
        .spyOn(taskLinkRepository, 'count')
        .mockResolvedValue(TASK_LINK_LIMIT * 2); // Exactly at limit

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.link_limit_reached',
      });
    });

    it('should return invalid when link count exceeds limit', async () => {
      jest
        .spyOn(taskLinkRepository, 'count')
        .mockResolvedValue(TASK_LINK_LIMIT * 2 + 1); // Above limit

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.link_limit_reached',
      });
    });

    it('should return invalid when link count is significantly above limit', async () => {
      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(100); // Well above limit

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.link_limit_reached',
      });
    });

    it('should return valid when no links exist', async () => {
      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(0);

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({ valid: true });
    });

    it('should work with different link types', async () => {
      const relatesToRequest: ValidationRequest = {
        ...mockValidationRequest,
        linkType: 'RELATES_TO',
      };

      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);

      const result = await validator['validate'](relatesToRequest);

      expect(result).toEqual({ valid: true });
      expect(taskLinkRepository.count).toHaveBeenCalledWith({
        where: [
          { sourceTaskId: 'task-123' },
          { targetTaskId: 'task-123' },
          { sourceTaskId: 'task-456' },
          { targetTaskId: 'task-456' },
        ],
      });
    });

    it('should work with different task IDs', async () => {
      const differentTaskRequest: ValidationRequest = {
        ...mockValidationRequest,
        sourceTask: { ...mockTask, id: 'task-999' } as Task,
        targetTask: { ...mockTargetTask, id: 'task-888' } as Task,
      };

      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(15);

      const result = await validator['validate'](differentTaskRequest);

      expect(result).toEqual({ valid: true });
      expect(taskLinkRepository.count).toHaveBeenCalledWith({
        where: [
          { sourceTaskId: 'task-999' },
          { targetTaskId: 'task-999' },
          { sourceTaskId: 'task-888' },
          { targetTaskId: 'task-888' },
        ],
      });
    });

    it('should handle database errors gracefully', async () => {
      jest
        .spyOn(taskLinkRepository, 'count')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        validator['validate'](mockValidationRequest),
      ).rejects.toThrow('Database error');
    });
  });

  describe('edge cases', () => {
    it('should handle TASK_LINK_LIMIT constant correctly', () => {
      expect(TASK_LINK_LIMIT).toBeDefined();
      expect(typeof TASK_LINK_LIMIT).toBe('number');
      expect(TASK_LINK_LIMIT).toBeGreaterThan(0);
    });

    it('should validate against TASK_LINK_LIMIT * 2 threshold', async () => {
      const threshold = TASK_LINK_LIMIT * 2;

      // Test just below threshold
      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(threshold - 1);
      let result = await validator['validate'](mockValidationRequest);
      expect(result).toEqual({ valid: true });

      // Test at threshold
      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(threshold);
      result = await validator['validate'](mockValidationRequest);
      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.link_limit_reached',
      });

      // Test just above threshold
      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(threshold + 1);
      result = await validator['validate'](mockValidationRequest);
      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.link_limit_reached',
      });
    });
  });
});
