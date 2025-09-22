import { Test, TestingModule } from '@nestjs/testing';
import { GlobalTasksController } from './global-tasks.controller';
import { TasksService } from '../tasks.service';
import { User } from '../../users/entities/user.entity';
import { Task } from '../entities/task.entity';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { GlobalSearchTasksDto } from '../dto/global-search-tasks.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

describe('GlobalTasksController', () => {
  let controller: GlobalTasksController;
  let tasksService: TasksService;

  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
    isEmailConfirmed: true,
    avatarUrl: 'https://example.com/avatar.jpg',
    refreshTokens: [],
  };

  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null,
    projectId: 'project-123',
    project: {
      id: 'project-123',
      name: 'Test Project',
      description: 'Test Project Description',
      status: 'ACTIVE' as any,
      ownerId: 'user-123',
      owner: mockUser,
      contributors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    assigneeId: 'user-123',
    assignee: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTasksService = {
    findAllUserTasks: jest.fn(),
    searchAllUserTasks: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalTasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GlobalTasksController>(GlobalTasksController);
    tasksService = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllUserTasks', () => {
    it('should return paginated tasks with metadata', async () => {
      const searchDto: GlobalSearchTasksDto = {
        page: 1,
        limit: 20,
      };

      const mockResult = {
        tasks: [mockTask],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockTasksService.findAllUserTasks.mockResolvedValue(mockResult);

      const result = await controller.findAllUserTasks(
        { user: mockUser },
        searchDto,
      );

      expect(tasksService.findAllUserTasks).toHaveBeenCalledWith(
        mockUser.id,
        searchDto,
      );
      expect(result).toEqual({
        tasks: [expect.objectContaining({ id: 'task-123' })],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should handle empty results', async () => {
      const searchDto: GlobalSearchTasksDto = {
        page: 1,
        limit: 20,
      };

      const mockResult = {
        tasks: [],
        total: 0,
        page: 1,
        limit: 20,
      };

      mockTasksService.findAllUserTasks.mockResolvedValue(mockResult);

      const result = await controller.findAllUserTasks(
        { user: mockUser },
        searchDto,
      );

      expect(result).toEqual({
        tasks: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });
  });

  describe('searchAllUserTasks', () => {
    it('should return filtered tasks with metadata', async () => {
      const searchDto: GlobalSearchTasksDto = {
        query: 'test',
        status: TaskStatus.TODO,
        page: 1,
        limit: 10,
      };

      const mockResult = {
        tasks: [mockTask],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockTasksService.searchAllUserTasks.mockResolvedValue(mockResult);

      const result = await controller.searchAllUserTasks(
        { user: mockUser },
        searchDto,
      );

      expect(tasksService.searchAllUserTasks).toHaveBeenCalledWith(
        mockUser.id,
        searchDto,
      );
      expect(result).toEqual({
        tasks: [expect.objectContaining({ id: 'task-123' })],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('passes includeArchived flag through to service', async () => {
      const searchDto: GlobalSearchTasksDto = {
        page: 1,
        limit: 10,
        includeArchived: true,
      };

      const mockResult = {
        tasks: [mockTask],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockTasksService.searchAllUserTasks.mockResolvedValue(mockResult);

      await controller.searchAllUserTasks({ user: mockUser }, searchDto);

      expect(tasksService.searchAllUserTasks).toHaveBeenCalledWith(
        mockUser.id,
        searchDto,
      );
      expect(
        (mockTasksService.searchAllUserTasks as jest.Mock).mock.calls[0][1]
          .includeArchived,
      ).toBe(true);
    });
  });

  describe('legacy param rejection', () => {
    it('findAllUserTasks should 400 when legacy projectId is sent', async () => {
      const dto: GlobalSearchTasksDto = { page: 1, limit: 20 };
      await expect(
        controller.findAllUserTasks({ user: mockUser }, dto, 'proj-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('searchAllUserTasks should 400 when legacy projectId is sent', async () => {
      const dto: GlobalSearchTasksDto = { page: 1, limit: 20 };
      await expect(
        controller.searchAllUserTasks({ user: mockUser }, dto, 'proj-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
