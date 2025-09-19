import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLink } from '../../entities/task-link.entity';
import { OneRelationshipPerPairValidator } from './one-relationship-per-pair-validator';
import { Task } from '../../entities/task.entity';
import { TaskLinkType } from '../../enums/task-link-type.enum';

describe('OneRelationshipPerPairValidator', () => {
  let validator: OneRelationshipPerPairValidator;
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

  const mockExistingLink: TaskLink = {
    id: 'link-123',
    projectId: 'project-123',
    sourceTaskId: 'task-123',
    targetTaskId: 'task-456',
    type: 'RELATES_TO',
    createdAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OneRelationshipPerPairValidator,
        {
          provide: getRepositoryToken(TaskLink),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    validator = module.get<OneRelationshipPerPairValidator>(
      OneRelationshipPerPairValidator,
    );
    taskLinkRepository = module.get<Repository<TaskLink>>(
      getRepositoryToken(TaskLink),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should validate successfully when no existing relationship exists', async () => {
      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({ valid: true });
      expect(taskLinkRepository.findOne).toHaveBeenCalledWith({
        where: [
          {
            projectId: 'project-123',
            sourceTaskId: 'task-123',
            targetTaskId: 'task-456',
          },
          {
            projectId: 'project-123',
            sourceTaskId: 'task-456',
            targetTaskId: 'task-123',
          },
        ],
      });
    });

    it('should fail when existing relationship exists (source -> target)', async () => {
      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(
        mockExistingLink,
      );

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.duplicate_relationship',
      });
    });

    it('should fail when existing relationship exists (target -> source)', async () => {
      const reverseLink = {
        ...mockExistingLink,
        sourceTaskId: 'task-456',
        targetTaskId: 'task-123',
      };
      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(reverseLink);

      const result = await validator['validate'](mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.duplicate_relationship',
      });
    });

    it('should check both directions for existing relationships', async () => {
      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);

      await validator['validate'](mockValidationRequest);

      expect(taskLinkRepository.findOne).toHaveBeenCalledWith({
        where: [
          {
            projectId: 'project-123',
            sourceTaskId: 'task-123',
            targetTaskId: 'task-456',
          },
          {
            projectId: 'project-123',
            sourceTaskId: 'task-456',
            targetTaskId: 'task-123',
          },
        ],
      });
    });

    it('should handle different project IDs correctly', async () => {
      const requestWithDifferentProject = {
        ...mockValidationRequest,
        projectId: 'different-project',
      };

      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);

      await validator['validate'](requestWithDifferentProject);

      expect(taskLinkRepository.findOne).toHaveBeenCalledWith({
        where: [
          {
            projectId: 'different-project',
            sourceTaskId: 'task-123',
            targetTaskId: 'task-456',
          },
          {
            projectId: 'different-project',
            sourceTaskId: 'task-456',
            targetTaskId: 'task-123',
          },
        ],
      });
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      (taskLinkRepository.findOne as jest.Mock).mockRejectedValue(dbError);

      await expect(
        validator['validate'](mockValidationRequest),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Chain of Responsibility', () => {
    it('should chain to next validator on success', async () => {
      const nextValidator = {
        handle: jest.fn().mockResolvedValue({ valid: true }),
      };

      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(null);
      validator.setNext(nextValidator as any);

      const result = await validator.handle(mockValidationRequest);

      expect(result).toEqual({ valid: true });
      expect(nextValidator.handle).toHaveBeenCalledWith(mockValidationRequest);
    });

    it('should stop chain on failure', async () => {
      const nextValidator = {
        handle: jest.fn().mockResolvedValue({ valid: true }),
      };

      (taskLinkRepository.findOne as jest.Mock).mockResolvedValue(
        mockExistingLink,
      );
      validator.setNext(nextValidator as any);

      const result = await validator.handle(mockValidationRequest);

      expect(result).toEqual({
        valid: false,
        reason: 'errors.task_links.duplicate_relationship',
      });
      expect(nextValidator.handle).not.toHaveBeenCalled();
    });
  });
});
