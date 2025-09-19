import { Test, TestingModule } from '@nestjs/testing';
import { TaskLinkController } from './task-link.controller';
import { TaskLinkService } from '../services/task-link.service';
import { CreateTaskLinkBodyDto } from '../dto/create-task-link-body.dto';
import { TaskLinkDto } from '../dto/task-link.dto';
import { TaskLinkResponseDto } from '../dto/task-link-response.dto';
import { TaskLinkWithTaskDto } from '../dto/task-link-with-task.dto';

import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { ProjectPermissionGuard } from '../../projects/guards/project-permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ProjectRole } from '../../projects/enums/project-role.enum';
import { REQUIRE_PROJECT_ROLE_KEY } from '../../projects/decorators/require-project-role.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('TaskLinkController', () => {
  let controller: TaskLinkController;
  let taskLinkService: TaskLinkService;

  const mockTaskLink: TaskLinkDto = {
    id: 'link-123',
    projectId: 'project-123',
    sourceTaskId: 'task-123',
    targetTaskId: 'task-456',
    type: 'BLOCKS',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  const mockCreateTaskLinkDto: CreateTaskLinkBodyDto = {
    targetTaskId: 'task-456',
    type: 'BLOCKS',
  };

  const mockTaskLinkResponse: TaskLinkResponseDto = {
    links: [mockTaskLink],
    total: 1,
  };

  const mockTaskLinkWithTask: TaskLinkWithTaskDto = {
    id: 'link-123',
    projectId: 'project-123',
    sourceTaskId: 'task-123',
    targetTaskId: 'task-456',
    type: 'BLOCKS',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    sourceTask: {
      id: 'task-123',
      title: 'Source Task',
      description: 'Source task description',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
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
    },
    targetTask: {
      id: 'task-456',
      title: 'Target Task',
      description: 'Target task description',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      projectId: 'project-123',
      projectName: 'Project 123',
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
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskLinkController],
      providers: [
        {
          provide: TaskLinkService,
          useValue: {
            createLink: jest.fn(),
            listLinksByTask: jest.fn(),
            deleteLink: jest.fn(),
            listRelatedTaskIds: jest.fn(),
            listLinksWithTasks: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ProjectPermissionGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskLinkController>(TaskLinkController);
    taskLinkService = module.get<TaskLinkService>(TaskLinkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createLink', () => {
    it('should create a task link successfully', async () => {
      const projectId = 'project-123';
      const taskId = 'task-123';

      (taskLinkService.createLink as jest.Mock).mockResolvedValue(mockTaskLink);

      const result = await controller.createLink(
        projectId,
        taskId,
        mockCreateTaskLinkDto,
        'en-US',
      );

      expect(result).toBeInstanceOf(TaskLinkDto);
      expect(result).toEqual(mockTaskLink);
      expect(taskLinkService.createLink).toHaveBeenCalledWith(
        {
          projectId,
          sourceTaskId: taskId,
          targetTaskId: mockCreateTaskLinkDto.targetTaskId,
          type: mockCreateTaskLinkDto.type,
        },
        'en-US',
      );
    });

    it('should handle different link types', async () => {
      const projectId = 'project-123';
      const taskId = 'task-123';
      const relatesToDto: CreateTaskLinkBodyDto = {
        targetTaskId: 'task-789',
        type: 'RELATES_TO',
      };

      const relatesToLink = { ...mockTaskLink, type: 'RELATES_TO' };
      (taskLinkService.createLink as jest.Mock).mockResolvedValue(
        relatesToLink,
      );

      const result = await controller.createLink(
        projectId,
        taskId,
        relatesToDto,
        'en-US',
      );

      expect(result.type).toBe('RELATES_TO');
      expect(taskLinkService.createLink).toHaveBeenCalledWith(
        {
          projectId,
          sourceTaskId: taskId,
          targetTaskId: relatesToDto.targetTaskId,
          type: relatesToDto.type,
        },
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-123';
      const taskId = 'task-123';

      (taskLinkService.createLink as jest.Mock).mockResolvedValue(mockTaskLink);

      const result = await controller.createLink(
        projectId,
        taskId,
        mockCreateTaskLinkDto,
        'fr-FR',
      );

      expect(result).toBeInstanceOf(TaskLinkDto);
      expect(taskLinkService.createLink).toHaveBeenCalledWith(
        {
          projectId,
          sourceTaskId: taskId,
          targetTaskId: mockCreateTaskLinkDto.targetTaskId,
          type: mockCreateTaskLinkDto.type,
        },
        'fr-FR',
      );
    });
  });

  describe('list', () => {
    it('should return task links for a task', async () => {
      const taskId = 'task-123';

      (taskLinkService.listLinksByTask as jest.Mock).mockResolvedValue(
        mockTaskLinkResponse,
      );

      const result = await controller.list(taskId);

      expect(result).toBeInstanceOf(TaskLinkResponseDto);
      expect(result).toEqual(mockTaskLinkResponse);
      expect(taskLinkService.listLinksByTask).toHaveBeenCalledWith(taskId);
    });

    it('should handle empty results', async () => {
      const taskId = 'task-123';
      const emptyResponse: TaskLinkResponseDto = {
        links: [],
        total: 0,
      };

      (taskLinkService.listLinksByTask as jest.Mock).mockResolvedValue(
        emptyResponse,
      );

      const result = await controller.list(taskId);

      expect(result).toEqual(emptyResponse);
      expect(result.links).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete a task link successfully', async () => {
      const projectId = 'project-123';
      const taskId = 'task-123';
      const linkId = 'link-123';

      (taskLinkService.deleteLink as jest.Mock).mockResolvedValue(undefined);

      await controller.delete(projectId, taskId, linkId, 'en-US');

      expect(taskLinkService.deleteLink).toHaveBeenCalledWith(
        projectId,
        taskId,
        linkId,
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-123';
      const taskId = 'task-123';
      const linkId = 'link-123';

      (taskLinkService.deleteLink as jest.Mock).mockResolvedValue(undefined);

      await controller.delete(projectId, taskId, linkId, 'fr-FR');

      expect(taskLinkService.deleteLink).toHaveBeenCalledWith(
        projectId,
        taskId,
        linkId,
        'fr-FR',
      );
    });
  });

  describe('listRelated', () => {
    it('should return related task IDs', async () => {
      const taskId = 'task-123';
      const relatedIds = ['task-456', 'task-789'];

      (taskLinkService.listRelatedTaskIds as jest.Mock).mockResolvedValue(
        relatedIds,
      );

      const result = await controller.listRelated(taskId);

      expect(result).toEqual(relatedIds);
      expect(taskLinkService.listRelatedTaskIds).toHaveBeenCalledWith(taskId);
    });

    it('should handle empty related tasks', async () => {
      const taskId = 'task-123';

      (taskLinkService.listRelatedTaskIds as jest.Mock).mockResolvedValue([]);

      const result = await controller.listRelated(taskId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('listLinksDetailed', () => {
    it('should return task links with full task details', async () => {
      const taskId = 'task-123';
      const detailedLinks = [mockTaskLinkWithTask];

      (taskLinkService.listLinksWithTasks as jest.Mock).mockResolvedValue(
        detailedLinks,
      );

      const result = await controller.listLinksDetailed(taskId);

      expect(result).toEqual(detailedLinks);
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
      expect(taskLinkService.listLinksWithTasks).toHaveBeenCalledWith(taskId);
    });

    it('should handle empty detailed results', async () => {
      const taskId = 'task-123';

      (taskLinkService.listLinksWithTasks as jest.Mock).mockResolvedValue([]);

      const result = await controller.listLinksDetailed(taskId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('Guards and Decorators', () => {
    let reflector: Reflector;

    beforeAll(() => {
      reflector = new Reflector();
    });

    it('should have JwtAuthGuard and ProjectPermissionGuard applied', () => {
      const guards = reflector.getAllAndMerge<any[]>('__guards__', [
        controller.createLink,
        TaskLinkController,
      ]);
      expect(guards).toHaveLength(2); // JwtAuthGuard, ProjectPermissionGuard
      expect(guards.some((g) => g === JwtAuthGuard)).toBe(true);
      expect(guards.some((g) => g === ProjectPermissionGuard)).toBe(true);
    });

    it('should require WRITE role for createLink', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.createLink,
      );
      expect(role).toBe(ProjectRole.WRITE);
    });

    it('should require READ role for list', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.list,
      );
      expect(role).toBe(ProjectRole.READ);
    });

    it('should require WRITE role for delete', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.delete,
      );
      expect(role).toBe(ProjectRole.WRITE);
    });

    it('should require READ role for listRelated', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.listRelated,
      );
      expect(role).toBe(ProjectRole.READ);
    });

    it('should require READ role for listLinksDetailed', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.listLinksDetailed,
      );
      expect(role).toBe(ProjectRole.READ);
    });
  });
});
