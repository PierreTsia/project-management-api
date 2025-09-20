import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DuplicateLinkValidator } from './duplicate-link-validator';
import { TaskLink } from '../../entities/task-link.entity';
import { ValidationRequest } from './task-relationship-validation-chain';
import { Task } from '../../entities/task.entity';
import { TaskStatus } from '../../enums/task-status.enum';
import { TaskPriority } from '../../enums/task-priority.enum';
import { TaskLinkType } from '../../enums/task-link-type.enum';

describe('DuplicateLinkValidator', () => {
  let validator: DuplicateLinkValidator;
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
        DuplicateLinkValidator,
        {
          provide: getRepositoryToken(TaskLink),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    validator = module.get<DuplicateLinkValidator>(DuplicateLinkValidator);
    taskLinkRepository = module.get<Repository<TaskLink>>(
      getRepositoryToken(TaskLink),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return valid when no duplicate links exist', async () => {
      jest.spyOn(taskLinkRepository, 'findOne').mockResolvedValue(null);

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({ valid: true });
      expect(taskLinkRepository.findOne).toHaveBeenCalledWith({
        where: [
          {
            projectId: 'project-123',
            sourceTaskId: 'task-123',
            targetTaskId: 'task-456',
            type: 'BLOCKS',
          },
          {
            projectId: 'project-123',
            sourceTaskId: 'task-123',
            targetTaskId: 'task-456',
            type: 'IS_BLOCKED_BY',
          },
          {
            projectId: 'project-123',
            sourceTaskId: 'task-456',
            targetTaskId: 'task-123',
            type: 'IS_BLOCKED_BY',
          },
        ],
      });
    });

    it('should return invalid when exact duplicate exists', async () => {
      const existingLink: Partial<TaskLink> = {
        id: 'link-123',
        projectId: 'project-123',
        sourceTaskId: 'task-123',
        targetTaskId: 'task-456',
        type: 'BLOCKS',
        createdAt: new Date(),
      };
      jest
        .spyOn(taskLinkRepository, 'findOne')
        .mockResolvedValue(existingLink as TaskLink);

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.already_exists',
      });
    });

    it('should return invalid when reverse direction duplicate exists', async () => {
      const reverseLink: Partial<TaskLink> = {
        id: 'link-456',
        projectId: 'project-123',
        sourceTaskId: 'task-456',
        targetTaskId: 'task-123',
        type: 'BLOCKS',
        createdAt: new Date(),
      };
      jest
        .spyOn(taskLinkRepository, 'findOne')
        .mockResolvedValue(reverseLink as TaskLink);

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.already_exists',
      });
    });

    it('should return invalid when inverse type duplicate exists', async () => {
      const inverseLink: Partial<TaskLink> = {
        id: 'link-789',
        projectId: 'project-123',
        sourceTaskId: 'task-123',
        targetTaskId: 'task-456',
        type: 'IS_BLOCKED_BY',
        createdAt: new Date(),
      };
      jest
        .spyOn(taskLinkRepository, 'findOne')
        .mockResolvedValue(inverseLink as TaskLink);

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.already_exists',
      });
    });

    it('should return invalid when inverse type reverse direction duplicate exists', async () => {
      const inverseReverseLink: Partial<TaskLink> = {
        id: 'link-101',
        projectId: 'project-123',
        sourceTaskId: 'task-456',
        targetTaskId: 'task-123',
        type: 'IS_BLOCKED_BY',
        createdAt: new Date(),
      };
      jest
        .spyOn(taskLinkRepository, 'findOne')
        .mockResolvedValue(inverseReverseLink as TaskLink);

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.already_exists',
      });
    });

    it('should test SPLITS_TO relationship duplicate detection', async () => {
      const splitsToRequest: ValidationRequest = {
        ...mockValidationRequest,
        linkType: 'SPLITS_TO',
      };

      const existingSplitsFromLink: Partial<TaskLink> = {
        id: 'link-202',
        projectId: 'project-123',
        sourceTaskId: 'task-456',
        targetTaskId: 'task-123',
        type: 'SPLITS_FROM',
        createdAt: new Date(),
      };
      jest
        .spyOn(taskLinkRepository, 'findOne')
        .mockResolvedValue(existingSplitsFromLink as TaskLink);

      const result = await validator['validate'](splitsToRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.already_exists',
      });
    });

    it('should test DUPLICATES relationship duplicate detection', async () => {
      const duplicatesRequest: ValidationRequest = {
        ...mockValidationRequest,
        linkType: 'DUPLICATES',
      };

      const existingIsDuplicatedByLink: Partial<TaskLink> = {
        id: 'link-303',
        projectId: 'project-123',
        sourceTaskId: 'task-123',
        targetTaskId: 'task-456',
        type: 'IS_DUPLICATED_BY',
        createdAt: new Date(),
      };
      jest
        .spyOn(taskLinkRepository, 'findOne')
        .mockResolvedValue(existingIsDuplicatedByLink as TaskLink);

      const result = await validator['validate'](duplicatesRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.already_exists',
      });
    });

    it('should test RELATES_TO relationship duplicate detection (symmetric)', async () => {
      const relatesToRequest: ValidationRequest = {
        ...mockValidationRequest,
        linkType: 'RELATES_TO',
      };

      const existingRelatesToLink: Partial<TaskLink> = {
        id: 'link-404',
        projectId: 'project-123',
        sourceTaskId: 'task-456',
        targetTaskId: 'task-123',
        type: 'RELATES_TO',
        createdAt: new Date(),
      };
      jest
        .spyOn(taskLinkRepository, 'findOne')
        .mockResolvedValue(existingRelatesToLink as TaskLink);

      const result = await validator['validate'](relatesToRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.already_exists',
      });
    });
  });

  describe('getInverseLinkType', () => {
    it('should return correct inverse types for all relationship types', () => {
      const testCases = [
        { input: 'IS_BLOCKED_BY', expected: 'BLOCKS' },
        { input: 'BLOCKS', expected: 'IS_BLOCKED_BY' },
        { input: 'SPLITS_TO', expected: 'SPLITS_FROM' },
        { input: 'SPLITS_FROM', expected: 'SPLITS_TO' },
        { input: 'DUPLICATES', expected: 'IS_DUPLICATED_BY' },
        { input: 'IS_DUPLICATED_BY', expected: 'DUPLICATES' },
        { input: 'RELATES_TO', expected: 'RELATES_TO' },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = validator['getInverseLinkType'](input as TaskLinkType);
        expect(result).toBe(expected);
      });
    });
  });
});
