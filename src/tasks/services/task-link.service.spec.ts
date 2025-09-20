import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { TaskLinkService } from './task-link.service';
import { TaskLink } from '../entities/task-link.entity';
import { Task } from '../entities/task.entity';
import { CreateTaskLinkDto } from '../dto/create-task-link.dto';
import { TaskLinkWithTaskDto } from '../dto/task-link-with-task.dto';
import { TaskRelationshipValidationChain } from './validation/task-relationship-validation-chain';
import { CustomLogger } from '../../common/services/logger.service';
import { MockCustomLogger } from '../../test/mocks';
import { TASK_LINK_LIMIT } from '../tasks.module';

describe('TaskLinkService', () => {
  let service: TaskLinkService;
  let taskLinkRepository: Repository<TaskLink>;
  let taskRepository: Repository<Task>;
  let relationshipValidator: TaskRelationshipValidationChain;
  let i18nService: I18nService;
  let mockLogger: MockCustomLogger;

  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO' as any,
    priority: 'MEDIUM' as any,
    dueDate: new Date(),
    projectId: 'project-123',
    assigneeId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    project: undefined,
    assignee: undefined,
  };

  const mockTaskLink: TaskLink = {
    id: 'link-123',
    projectId: 'project-123',
    sourceTaskId: 'task-123',
    targetTaskId: 'task-456',
    type: 'BLOCKS' as any,
    createdAt: new Date(),
    project: undefined,
    sourceTask: undefined,
    targetTask: undefined,
  };

  const mockCreateTaskLinkDto: CreateTaskLinkDto = {
    projectId: 'project-123',
    sourceTaskId: 'task-123',
    targetTaskId: 'task-456',
    type: 'BLOCKS' as any,
  };

  const _mockTaskLinkWithTask: TaskLinkWithTaskDto = {
    id: 'link-123',
    projectId: 'project-123',
    sourceTaskId: 'task-123',
    targetTaskId: 'task-456',
    type: 'BLOCKS' as any,
    createdAt: new Date(),
    sourceTask: {
      id: 'task-123',
      title: 'Source Task',
      description: 'Source task description',
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
        provider: 'local' as any,
        canChangePassword: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    targetTask: {
      id: 'task-456',
      title: 'Target Task',
      description: 'Target task description',
      status: 'TODO' as any,
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
        provider: 'local' as any,
        canChangePassword: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLinkService,
        {
          provide: getRepositoryToken(TaskLink),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            t: jest.fn((key: string) => key),
          },
        },
        {
          provide: TaskRelationshipValidationChain,
          useValue: {
            canCreateLink: jest.fn(),
          },
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<TaskLinkService>(TaskLinkService);
    taskLinkRepository = module.get<Repository<TaskLink>>(
      getRepositoryToken(TaskLink),
    );
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    relationshipValidator = module.get<TaskRelationshipValidationChain>(
      TaskRelationshipValidationChain,
    );
    i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLink', () => {
    it('should create a task link successfully', async () => {
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);
      jest
        .spyOn(relationshipValidator, 'canCreateLink')
        .mockResolvedValue({ valid: true });
      jest.spyOn(taskLinkRepository, 'create').mockReturnValue(mockTaskLink);
      jest.spyOn(taskLinkRepository, 'save').mockResolvedValue(mockTaskLink);

      const result = await service.createLink(mockCreateTaskLinkDto, 'en-US');

      expect(result).toEqual(mockTaskLink);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCreateTaskLinkDto.sourceTaskId },
      });
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCreateTaskLinkDto.targetTaskId },
      });
      expect(taskLinkRepository.count).toHaveBeenCalled();
      expect(relationshipValidator.canCreateLink).toHaveBeenCalledWith({
        sourceTask: mockTask,
        targetTask: mockTask,
        linkType: mockCreateTaskLinkDto.type,
        projectId: mockCreateTaskLinkDto.projectId,
      });
      expect(taskLinkRepository.create).toHaveBeenCalledWith({
        projectId: mockCreateTaskLinkDto.projectId,
        sourceTaskId: mockCreateTaskLinkDto.sourceTaskId,
        targetTaskId: mockCreateTaskLinkDto.targetTaskId,
        type: mockCreateTaskLinkDto.type,
      });
      expect(taskLinkRepository.save).toHaveBeenCalledWith(mockTaskLink);
    });

    it('should throw NotFoundException when source task not found', async () => {
      jest.spyOn(taskRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(taskRepository, 'findOne').mockResolvedValueOnce(mockTask);

      await expect(
        service.createLink(mockCreateTaskLinkDto, 'en-US'),
      ).rejects.toThrow(NotFoundException);

      expect(i18nService.t).toHaveBeenCalledWith(
        'errors.tasks.task_not_found',
        {
          args: {
            id: mockCreateTaskLinkDto.sourceTaskId,
            projectId: mockCreateTaskLinkDto.projectId,
          },
          lang: 'en-US',
        },
      );
    });

    it('should throw NotFoundException when target task not found', async () => {
      jest.spyOn(taskRepository, 'findOne').mockResolvedValueOnce(mockTask);
      jest.spyOn(taskRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(
        service.createLink(mockCreateTaskLinkDto, 'en-US'),
      ).rejects.toThrow(NotFoundException);

      expect(i18nService.t).toHaveBeenCalledWith(
        'errors.tasks.task_not_found',
        {
          args: {
            id: mockCreateTaskLinkDto.targetTaskId,
            projectId: mockCreateTaskLinkDto.projectId,
          },
          lang: 'en-US',
        },
      );
    });

    it('should throw BadRequestException when link limit reached', async () => {
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(45);

      await expect(
        service.createLink(mockCreateTaskLinkDto, 'en-US'),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.t).toHaveBeenCalledWith(
        'errors.task_links.link_limit_reached',
        {
          args: { limit: TASK_LINK_LIMIT },
          lang: 'en-US',
        },
      );
    });

    it('should throw BadRequestException when validation fails', async () => {
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);
      jest.spyOn(relationshipValidator, 'canCreateLink').mockResolvedValue({
        valid: false,
        reason: 'errors.task_links.circular_dependency',
      });

      await expect(
        service.createLink(mockCreateTaskLinkDto, 'en-US'),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.t).toHaveBeenCalledWith(
        'errors.task_links.circular_dependency',
        {
          lang: 'en-US',
        },
      );
    });

    describe('duplicate link prevention', () => {
      it('should throw BadRequestException when exact duplicate link exists', async () => {
        jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
        jest
          .spyOn(taskLinkRepository, 'findOne')
          .mockResolvedValue(mockTaskLink);
        jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);

        await expect(
          service.createLink(mockCreateTaskLinkDto, 'en-US'),
        ).rejects.toThrow(BadRequestException);

        expect(i18nService.t).toHaveBeenCalledWith(
          'errors.task_links.already_exists',
          {
            lang: 'en-US',
          },
        );
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
              sourceTaskId: 'task-456',
              targetTaskId: 'task-123',
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

      it('should throw BadRequestException when reverse direction duplicate exists', async () => {
        const reverseLink = {
          ...mockTaskLink,
          sourceTaskId: 'task-456',
          targetTaskId: 'task-123',
          type: 'BLOCKS' as any,
        };

        jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
        jest
          .spyOn(taskLinkRepository, 'findOne')
          .mockResolvedValue(reverseLink);
        jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);

        await expect(
          service.createLink(mockCreateTaskLinkDto, 'en-US'),
        ).rejects.toThrow(BadRequestException);

        expect(i18nService.t).toHaveBeenCalledWith(
          'errors.task_links.already_exists',
          {
            lang: 'en-US',
          },
        );
      });

      it('should throw BadRequestException when inverse type duplicate exists', async () => {
        const inverseLink = {
          ...mockTaskLink,
          type: 'IS_BLOCKED_BY' as any,
        };

        jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
        jest
          .spyOn(taskLinkRepository, 'findOne')
          .mockResolvedValue(inverseLink);
        jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);

        await expect(
          service.createLink(mockCreateTaskLinkDto, 'en-US'),
        ).rejects.toThrow(BadRequestException);

        expect(i18nService.t).toHaveBeenCalledWith(
          'errors.task_links.already_exists',
          {
            lang: 'en-US',
          },
        );
      });

      it('should throw BadRequestException when inverse type reverse direction duplicate exists', async () => {
        const inverseReverseLink = {
          ...mockTaskLink,
          sourceTaskId: 'task-456',
          targetTaskId: 'task-123',
          type: 'IS_BLOCKED_BY' as any,
        };

        jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
        jest
          .spyOn(taskLinkRepository, 'findOne')
          .mockResolvedValue(inverseReverseLink);
        jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);

        await expect(
          service.createLink(mockCreateTaskLinkDto, 'en-US'),
        ).rejects.toThrow(BadRequestException);

        expect(i18nService.t).toHaveBeenCalledWith(
          'errors.task_links.already_exists',
          {
            lang: 'en-US',
          },
        );
      });

      it('should allow creating link when no duplicates exist', async () => {
        jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
        jest.spyOn(taskLinkRepository, 'findOne').mockResolvedValue(null); // No existing link
        jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);
        jest
          .spyOn(relationshipValidator, 'canCreateLink')
          .mockResolvedValue({ valid: true });
        jest.spyOn(taskLinkRepository, 'create').mockReturnValue(mockTaskLink);
        jest.spyOn(taskLinkRepository, 'save').mockResolvedValue(mockTaskLink);

        const result = await service.createLink(mockCreateTaskLinkDto, 'en-US');

        expect(result).toEqual(mockTaskLink);
        expect(taskLinkRepository.save).toHaveBeenCalledTimes(2); // Original + inverse
      });

      it('should test duplicate prevention for SPLITS_TO relationship', async () => {
        const splitsToDto: CreateTaskLinkDto = {
          projectId: 'project-123',
          sourceTaskId: 'task-123',
          targetTaskId: 'task-456',
          type: 'SPLITS_TO' as any,
        };

        const existingSplitsFromLink = {
          ...mockTaskLink,
          sourceTaskId: 'task-456',
          targetTaskId: 'task-123',
          type: 'SPLITS_FROM' as any,
        };

        jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
        jest
          .spyOn(taskLinkRepository, 'findOne')
          .mockResolvedValue(existingSplitsFromLink);
        jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);

        await expect(service.createLink(splitsToDto, 'en-US')).rejects.toThrow(
          BadRequestException,
        );

        expect(i18nService.t).toHaveBeenCalledWith(
          'errors.task_links.already_exists',
          {
            lang: 'en-US',
          },
        );
      });

      it('should test duplicate prevention for DUPLICATES relationship', async () => {
        const duplicatesDto: CreateTaskLinkDto = {
          projectId: 'project-123',
          sourceTaskId: 'task-123',
          targetTaskId: 'task-456',
          type: 'DUPLICATES' as any,
        };

        const existingIsDuplicatedByLink = {
          ...mockTaskLink,
          type: 'IS_DUPLICATED_BY' as any,
        };

        jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
        jest
          .spyOn(taskLinkRepository, 'findOne')
          .mockResolvedValue(existingIsDuplicatedByLink);
        jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);

        await expect(
          service.createLink(duplicatesDto, 'en-US'),
        ).rejects.toThrow(BadRequestException);

        expect(i18nService.t).toHaveBeenCalledWith(
          'errors.task_links.already_exists',
          {
            lang: 'en-US',
          },
        );
      });

      it('should test duplicate prevention for RELATES_TO relationship (symmetric)', async () => {
        const relatesToDto: CreateTaskLinkDto = {
          projectId: 'project-123',
          sourceTaskId: 'task-123',
          targetTaskId: 'task-456',
          type: 'RELATES_TO' as any,
        };

        const existingRelatesToLink = {
          ...mockTaskLink,
          sourceTaskId: 'task-456',
          targetTaskId: 'task-123',
          type: 'RELATES_TO' as any,
        };

        jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
        jest
          .spyOn(taskLinkRepository, 'findOne')
          .mockResolvedValue(existingRelatesToLink);
        jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);

        await expect(service.createLink(relatesToDto, 'en-US')).rejects.toThrow(
          BadRequestException,
        );

        expect(i18nService.t).toHaveBeenCalledWith(
          'errors.task_links.already_exists',
          {
            lang: 'en-US',
          },
        );
      });
    });

    it('should handle accept-language header', async () => {
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(5);
      jest
        .spyOn(relationshipValidator, 'canCreateLink')
        .mockResolvedValue({ valid: true });
      jest.spyOn(taskLinkRepository, 'create').mockReturnValue(mockTaskLink);
      jest.spyOn(taskLinkRepository, 'save').mockResolvedValue(mockTaskLink);

      const result = await service.createLink(mockCreateTaskLinkDto, 'fr-FR');

      expect(result).toEqual(mockTaskLink);
      // The service should work with the accept-language parameter
      expect(taskRepository.findOne).toHaveBeenCalled();
    });
  });

  describe('listLinksByTask', () => {
    it('should return task links for a task', async () => {
      const mockLinks = [mockTaskLink];
      jest.spyOn(taskLinkRepository, 'find').mockResolvedValue(mockLinks);

      const result = await service.listLinksByTask('task-123');

      expect(result).toEqual({
        links: mockLinks,
        total: 1,
      });
      expect(taskLinkRepository.find).toHaveBeenCalledWith({
        where: [{ sourceTaskId: 'task-123' }, { targetTaskId: 'task-123' }],
        order: { createdAt: 'DESC' },
      });
    });

    it('should handle empty results', async () => {
      jest.spyOn(taskLinkRepository, 'find').mockResolvedValue([]);

      const result = await service.listLinksByTask('task-123');

      expect(result).toEqual({
        links: [],
        total: 0,
      });
    });
  });

  describe('deleteLink', () => {
    it('should delete a task link successfully', async () => {
      jest.spyOn(taskLinkRepository, 'findOne').mockResolvedValue(mockTaskLink);
      jest
        .spyOn(taskLinkRepository, 'delete')
        .mockResolvedValue({ affected: 1 } as any);

      await service.deleteLink('project-123', 'task-123', 'link-123', 'en-US');

      expect(taskLinkRepository.findOne).toHaveBeenCalledWith({
        where: [
          {
            id: 'link-123',
            projectId: 'project-123',
            sourceTaskId: 'task-123',
          },
          {
            id: 'link-123',
            projectId: 'project-123',
            targetTaskId: 'task-123',
          },
        ],
      });
      expect(taskLinkRepository.delete).toHaveBeenCalledWith({
        id: 'link-123',
      });
    });

    it('should throw NotFoundException when link not found', async () => {
      jest.spyOn(taskLinkRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.deleteLink('project-123', 'task-123', 'link-123', 'en-US'),
      ).rejects.toThrow(NotFoundException);

      expect(i18nService.t).toHaveBeenCalledWith(
        'errors.task_links.not_found',
        {
          lang: 'en-US',
          args: {
            linkId: 'link-123',
            taskId: 'task-123',
            projectId: 'project-123',
          },
        },
      );
    });

    it('should handle accept-language header', async () => {
      jest.spyOn(taskLinkRepository, 'findOne').mockResolvedValue(mockTaskLink);
      jest
        .spyOn(taskLinkRepository, 'delete')
        .mockResolvedValue({ affected: 1 } as any);

      await service.deleteLink('project-123', 'task-123', 'link-123', 'fr-FR');

      expect(taskLinkRepository.findOne).toHaveBeenCalled();
      expect(taskLinkRepository.delete).toHaveBeenCalledWith({
        id: 'link-123',
      });
    });
  });

  describe('listRelatedTaskIds', () => {
    it('should return related task IDs', async () => {
      const mockLinks = [
        { ...mockTaskLink, sourceTaskId: 'task-123', targetTaskId: 'task-456' },
        { ...mockTaskLink, sourceTaskId: 'task-789', targetTaskId: 'task-123' },
      ];
      jest.spyOn(taskLinkRepository, 'find').mockResolvedValue(mockLinks);

      const result = await service.listRelatedTaskIds('task-123');

      expect(result).toEqual(['task-456', 'task-789']);
      expect(taskLinkRepository.find).toHaveBeenCalledWith({
        where: [{ sourceTaskId: 'task-123' }, { targetTaskId: 'task-123' }],
      });
    });

    it('should handle empty results', async () => {
      jest.spyOn(taskLinkRepository, 'find').mockResolvedValue([]);

      const result = await service.listRelatedTaskIds('task-123');

      expect(result).toEqual([]);
    });

    it('should deduplicate related task IDs', async () => {
      const mockLinks = [
        { ...mockTaskLink, sourceTaskId: 'task-123', targetTaskId: 'task-456' },
        { ...mockTaskLink, sourceTaskId: 'task-456', targetTaskId: 'task-123' },
      ];
      jest.spyOn(taskLinkRepository, 'find').mockResolvedValue(mockLinks);

      const result = await service.listRelatedTaskIds('task-123');

      expect(result).toEqual(['task-456']);
    });
  });

  describe('listLinksWithTasks', () => {
    it('should return task links with full task details', async () => {
      const mockLinkWithTasks = {
        ...mockTaskLink,
        sourceTask: {
          ...mockTask,
          id: 'task-123',
          project: {
            id: 'project-123',
            name: 'Test Project',
            status: 'ACTIVE' as any,
            ownerId: 'user-123',
            owner: undefined,
            contributors: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
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
            provider: 'local' as any,
            canChangePassword: true,
            refreshTokens: [],
          } as any,
        } as any,
        targetTask: {
          ...mockTask,
          id: 'task-456',
          project: {
            id: 'project-123',
            name: 'Test Project',
            status: 'ACTIVE' as any,
            ownerId: 'user-123',
            owner: undefined,
            contributors: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
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
            provider: 'local' as any,
            canChangePassword: true,
            refreshTokens: [],
          } as any,
        } as any,
      } as any;
      jest
        .spyOn(taskLinkRepository, 'find')
        .mockResolvedValue([mockLinkWithTasks]);

      const result = await service.listLinksWithTasks('task-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'link-123',
          projectId: 'project-123',
          sourceTaskId: 'task-123',
          targetTaskId: 'task-456',
          type: 'BLOCKS',
        }),
      );
      expect(result[0].sourceTask).toBeDefined();
      expect(result[0].targetTask).toBeDefined();
      expect(taskLinkRepository.find).toHaveBeenCalledWith({
        where: [{ sourceTaskId: 'task-123' }, { targetTaskId: 'task-123' }],
        relations: [
          'sourceTask',
          'targetTask',
          'sourceTask.assignee',
          'sourceTask.project',
          'targetTask.assignee',
          'targetTask.project',
        ],
      });
    });

    it('should handle empty results', async () => {
      jest.spyOn(taskLinkRepository, 'find').mockResolvedValue([]);

      const result = await service.listLinksWithTasks('task-123');

      expect(result).toEqual([]);
    });

    it('should handle links without task relations', async () => {
      const mockLinkWithoutTasks = {
        ...mockTaskLink,
        sourceTask: null,
        targetTask: null,
      };
      jest
        .spyOn(taskLinkRepository, 'find')
        .mockResolvedValue([mockLinkWithoutTasks]);

      const result = await service.listLinksWithTasks('task-123');

      expect(result).toHaveLength(1);
      expect(result[0].sourceTask).toBeUndefined();
      expect(result[0].targetTask).toBeUndefined();
    });
  });

  describe('bidirectional links', () => {
    it('should create both original and inverse links when creating a link', async () => {
      const createLinkDto: CreateTaskLinkDto = {
        projectId: 'project-123',
        sourceTaskId: 'task-123',
        targetTaskId: 'task-456',
        type: 'IS_BLOCKED_BY',
      };

      const originalLink = { ...mockTaskLink, type: 'IS_BLOCKED_BY' as any };
      const inverseLink = {
        ...mockTaskLink,
        id: 'link-456',
        sourceTaskId: 'task-456',
        targetTaskId: 'task-123',
        type: 'BLOCKS' as any,
      };

      jest
        .spyOn(taskRepository, 'findOne')
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce({ ...mockTask, id: 'task-456' });
      jest.spyOn(taskLinkRepository, 'findOne').mockResolvedValue(null); // No existing link
      jest.spyOn(taskLinkRepository, 'count').mockResolvedValue(0);
      jest.spyOn(relationshipValidator, 'canCreateLink').mockResolvedValue({
        valid: true,
      });
      jest
        .spyOn(taskLinkRepository, 'create')
        .mockReturnValueOnce(originalLink)
        .mockReturnValueOnce(inverseLink);
      jest
        .spyOn(taskLinkRepository, 'save')
        .mockResolvedValueOnce(originalLink)
        .mockResolvedValueOnce(inverseLink);

      const result = await service.createLink(createLinkDto);

      expect(result).toEqual(originalLink);
      expect(taskLinkRepository.save).toHaveBeenCalledTimes(2);
      // The first call should be with the original link entity
      expect(taskLinkRepository.save).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          projectId: 'project-123',
          sourceTaskId: 'task-123',
          targetTaskId: 'task-456',
          type: 'IS_BLOCKED_BY',
        }),
      );
      // The second call should be with the inverse link entity
      expect(taskLinkRepository.save).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          projectId: 'project-123',
          sourceTaskId: 'task-456',
          targetTaskId: 'task-123',
          type: 'BLOCKS',
        }),
      );
    });

    it('should delete both original and inverse links when deleting a link', async () => {
      const originalLink = { ...mockTaskLink, type: 'IS_BLOCKED_BY' as any };
      const inverseLink = {
        ...mockTaskLink,
        id: 'link-456',
        sourceTaskId: 'task-456',
        targetTaskId: 'task-123',
        type: 'BLOCKS' as any,
      };

      jest
        .spyOn(taskLinkRepository, 'findOne')
        .mockResolvedValueOnce(originalLink)
        .mockResolvedValueOnce(inverseLink);
      jest.spyOn(taskLinkRepository, 'delete').mockResolvedValue({
        affected: 1,
      } as any);

      await service.deleteLink('project-123', 'task-123', 'link-123');

      expect(taskLinkRepository.delete).toHaveBeenCalledTimes(2);
      expect(taskLinkRepository.delete).toHaveBeenNthCalledWith(1, {
        id: 'link-123',
      });
      expect(taskLinkRepository.delete).toHaveBeenNthCalledWith(2, {
        id: 'link-456',
      });
    });

    it('should handle all relationship types correctly', () => {
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
        // Access private method for testing
        const result = (service as any).getInverseLinkType(input);
        expect(result).toBe(expected);
      });
    });
  });
});
