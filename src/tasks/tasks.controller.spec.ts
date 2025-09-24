import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ProjectRole } from '../projects/enums/project-role.enum';
import { REQUIRE_PROJECT_ROLE_KEY } from '../projects/decorators/require-project-role.decorator';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: TasksService;

  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: new Date('2025-01-01T00:00:00.000Z'),
    projectId: 'project-1',
    assigneeId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: {
            create: jest.fn(),
            createMany: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            updateStatus: jest.fn(),
            assignTask: jest.fn(),
            unassignTask: jest.fn(),
            searchTasks: jest.fn(),
            getTaskLinks: jest.fn(),
            getLinksMap: jest.fn(),
            getTaskWithRelationships: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ProjectPermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Setup mock return values
  beforeEach(() => {
    (tasksService.getTaskLinks as jest.Mock).mockResolvedValue([]);
    (tasksService.getLinksMap as jest.Mock).mockResolvedValue(new Map());
    (tasksService.getTaskWithRelationships as jest.Mock).mockResolvedValue({
      links: [],
      hierarchy: { parents: [], children: [], parentCount: 0, childCount: 0 },
    });
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new task successfully', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Task Description',
        priority: TaskPriority.HIGH,
        dueDate: '2025-02-01T00:00:00.000Z',
        assigneeId: 'user-2',
      };
      const projectId = 'project-1';

      (tasksService.create as jest.Mock).mockResolvedValue(mockTask);

      const result = await controller.create(projectId, createTaskDto);

      expect(result).toBeInstanceOf(TaskResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: mockTask.id,
          title: mockTask.title,
          description: mockTask.description,
          status: mockTask.status,
          priority: mockTask.priority,
          projectId: mockTask.projectId,
          assigneeId: mockTask.assigneeId,
        }),
      );
      expect(tasksService.create).toHaveBeenCalledWith(
        createTaskDto,
        projectId,
      );
    });
  });

  describe('createBulk', () => {
    it('should create many tasks successfully', async () => {
      const projectId = 'project-1';
      const bulkDto = { items: [{ title: 'A' }, { title: 'B' }] } as any;
      (tasksService.createMany as jest.Mock).mockResolvedValue([
        mockTask,
        mockTask,
      ]);
      (tasksService.getLinksMap as jest.Mock).mockResolvedValue(new Map());

      const result = await controller.createBulk(projectId, bulkDto);

      expect(tasksService.createMany).toHaveBeenCalledWith(bulkDto, projectId);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(TaskResponseDto);
    });
  });

  describe('findAll', () => {
    it('should return all tasks for a project', async () => {
      const projectId = 'project-1';
      const tasks = [mockTask];

      (tasksService.findAll as jest.Mock).mockResolvedValue(tasks);

      const result = await controller.findAll(projectId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(TaskResponseDto);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: mockTask.id,
          title: mockTask.title,
          description: mockTask.description,
          status: mockTask.status,
          priority: mockTask.priority,
          projectId: mockTask.projectId,
          assigneeId: mockTask.assigneeId,
        }),
      );
      expect(tasksService.findAll).toHaveBeenCalledWith(projectId);
    });
  });

  describe('searchTasks', () => {
    it('should call the service and return paginated tasks', async () => {
      const projectId = 'project-1';
      const searchDto = { query: 'test', page: 1, limit: 10 };
      const serviceResult = {
        tasks: [mockTask],
        total: 1,
        page: 1,
        limit: 10,
      };

      (tasksService.searchTasks as jest.Mock).mockResolvedValue(serviceResult);

      const result = await controller.searchTasks(projectId, searchDto);

      expect(tasksService.searchTasks).toHaveBeenCalledWith(
        projectId,
        searchDto,
      );
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0]).toBeInstanceOf(TaskResponseDto);
      expect(result.tasks[0].id).toBe(mockTask.id);
    });
  });

  describe('findOne', () => {
    it('should return a specific task by ID', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';

      (tasksService.findOne as jest.Mock).mockResolvedValue(mockTask);

      const result = await controller.findOne(projectId, taskId, 'en-US');

      expect(result).toBeInstanceOf(TaskResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: mockTask.id,
          title: mockTask.title,
          description: mockTask.description,
          status: mockTask.status,
          priority: mockTask.priority,
          projectId: mockTask.projectId,
          assigneeId: mockTask.assigneeId,
        }),
      );
      expect(tasksService.findOne).toHaveBeenCalledWith(
        taskId,
        projectId,
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';

      (tasksService.findOne as jest.Mock).mockResolvedValue(mockTask);

      const result = await controller.findOne(projectId, taskId, 'fr-FR');

      expect(result).toBeInstanceOf(TaskResponseDto);
      expect(tasksService.findOne).toHaveBeenCalledWith(
        taskId,
        projectId,
        'fr-FR',
      );
    });
  });

  describe('update', () => {
    it('should update a task successfully', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        description: 'Updated Description',
      };

      const updatedTask = { ...mockTask, ...updateTaskDto };

      (tasksService.update as jest.Mock).mockResolvedValue(updatedTask);

      const result = await controller.update(
        projectId,
        taskId,
        updateTaskDto,
        'en-US',
      );

      expect(result).toBeInstanceOf(TaskResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          status: updatedTask.status,
          priority: updatedTask.priority,
          projectId: updatedTask.projectId,
          assigneeId: updatedTask.assigneeId,
        }),
      );
      expect(tasksService.update).toHaveBeenCalledWith(
        taskId,
        projectId,
        updateTaskDto,
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
      };

      const updatedTask = { ...mockTask, ...updateTaskDto };

      (tasksService.update as jest.Mock).mockResolvedValue(updatedTask);

      const result = await controller.update(
        projectId,
        taskId,
        updateTaskDto,
        'fr-FR',
      );

      expect(result).toBeInstanceOf(TaskResponseDto);
      expect(tasksService.update).toHaveBeenCalledWith(
        taskId,
        projectId,
        updateTaskDto,
        'fr-FR',
      );
    });
  });

  describe('updateStatus', () => {
    it('should update task status successfully', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';
      const updateTaskStatusDto: UpdateTaskStatusDto = {
        status: TaskStatus.IN_PROGRESS,
      };
      const mockRequest = { user: { id: 'user-1' } };

      const updatedTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };

      (tasksService.updateStatus as jest.Mock).mockResolvedValue(updatedTask);

      const result = await controller.updateStatus(
        projectId,
        taskId,
        updateTaskStatusDto,
        mockRequest,
        'en-US',
      );

      expect(result).toBeInstanceOf(TaskResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          status: updatedTask.status,
          priority: updatedTask.priority,
          projectId: updatedTask.projectId,
          assigneeId: updatedTask.assigneeId,
        }),
      );
      expect(tasksService.updateStatus).toHaveBeenCalledWith(
        taskId,
        projectId,
        updateTaskStatusDto,
        'user-1',
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';
      const updateTaskStatusDto: UpdateTaskStatusDto = {
        status: TaskStatus.DONE,
      };
      const mockRequest = { user: { id: 'user-1' } };

      const updatedTask = { ...mockTask, status: TaskStatus.DONE };

      (tasksService.updateStatus as jest.Mock).mockResolvedValue(updatedTask);

      const result = await controller.updateStatus(
        projectId,
        taskId,
        updateTaskStatusDto,
        mockRequest,
        'fr-FR',
      );

      expect(result).toBeInstanceOf(TaskResponseDto);
      expect(tasksService.updateStatus).toHaveBeenCalledWith(
        taskId,
        projectId,
        updateTaskStatusDto,
        'user-1',
        'fr-FR',
      );
    });
  });

  describe('remove', () => {
    it('should remove a task successfully', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';

      (tasksService.remove as jest.Mock).mockResolvedValue(undefined);

      await controller.remove(projectId, taskId, 'en-US');

      expect(tasksService.remove).toHaveBeenCalledWith(
        taskId,
        projectId,
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';

      (tasksService.remove as jest.Mock).mockResolvedValue(undefined);

      await controller.remove(projectId, taskId, 'fr-FR');

      expect(tasksService.remove).toHaveBeenCalledWith(
        taskId,
        projectId,
        'fr-FR',
      );
    });
  });

  describe('assignTask', () => {
    it('should assign task successfully', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';
      const assignTaskDto: AssignTaskDto = {
        assigneeId: 'user-2',
      };

      const assignedTask = { ...mockTask, assigneeId: 'user-2' };

      (tasksService.assignTask as jest.Mock).mockResolvedValue(assignedTask);

      const result = await controller.assignTask(
        projectId,
        taskId,
        assignTaskDto,
        'en-US',
      );

      expect(result).toBeInstanceOf(TaskResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: assignedTask.id,
          title: assignedTask.title,
          description: assignedTask.description,
          status: assignedTask.status,
          priority: assignedTask.priority,
          projectId: assignedTask.projectId,
          assigneeId: assignedTask.assigneeId,
        }),
      );
      expect(tasksService.assignTask).toHaveBeenCalledWith(
        taskId,
        projectId,
        assignTaskDto.assigneeId,
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';
      const assignTaskDto: AssignTaskDto = {
        assigneeId: 'user-3',
      };

      const assignedTask = { ...mockTask, assigneeId: 'user-3' };

      (tasksService.assignTask as jest.Mock).mockResolvedValue(assignedTask);

      const result = await controller.assignTask(
        projectId,
        taskId,
        assignTaskDto,
        'fr-FR',
      );

      expect(result).toBeInstanceOf(TaskResponseDto);
      expect(tasksService.assignTask).toHaveBeenCalledWith(
        taskId,
        projectId,
        assignTaskDto.assigneeId,
        'fr-FR',
      );
    });
  });

  describe('unassignTask', () => {
    it('should unassign task successfully', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';

      const unassignedTask = { ...mockTask, assigneeId: null };

      (tasksService.unassignTask as jest.Mock).mockResolvedValue(
        unassignedTask,
      );

      const result = await controller.unassignTask(projectId, taskId, 'en-US');

      expect(result).toBeInstanceOf(TaskResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: unassignedTask.id,
          title: unassignedTask.title,
          description: unassignedTask.description,
          status: unassignedTask.status,
          priority: unassignedTask.priority,
          projectId: unassignedTask.projectId,
          assigneeId: null,
        }),
      );
      expect(tasksService.unassignTask).toHaveBeenCalledWith(
        taskId,
        projectId,
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-1';
      const taskId = 'task-1';

      const unassignedTask = { ...mockTask, assigneeId: null };

      (tasksService.unassignTask as jest.Mock).mockResolvedValue(
        unassignedTask,
      );

      const result = await controller.unassignTask(projectId, taskId, 'fr-FR');

      expect(result).toBeInstanceOf(TaskResponseDto);
      expect(tasksService.unassignTask).toHaveBeenCalledWith(
        taskId,
        projectId,
        'fr-FR',
      );
    });
  });

  describe('Guards and Decorators', () => {
    let reflector: Reflector;

    beforeAll(() => {
      reflector = new Reflector();
    });

    it('should have JwtAuthGuard and ProjectPermissionGuard applied', () => {
      const guards = reflector.getAllAndMerge<any[]>('__guards__', [
        controller.create,
        TasksController,
      ]);
      expect(guards).toHaveLength(2);
      expect(guards.some((g) => g === JwtAuthGuard)).toBe(true);
      expect(guards.some((g) => g === ProjectPermissionGuard)).toBe(true);
    });

    it('should require WRITE role for create', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.create,
      );
      expect(role).toBe(ProjectRole.WRITE);
    });

    it('should require READ role for findAll', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.findAll,
      );
      expect(role).toBe(ProjectRole.READ);
    });

    it('should require READ role for findOne', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.findOne,
      );
      expect(role).toBe(ProjectRole.READ);
    });

    it('should require WRITE role for update', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.update,
      );
      expect(role).toBe(ProjectRole.WRITE);
    });

    it('should require WRITE role for remove', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.remove,
      );
      expect(role).toBe(ProjectRole.WRITE);
    });

    it('should require WRITE role for updateStatus', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.updateStatus,
      );
      expect(role).toBe(ProjectRole.WRITE);
    });

    it('should require WRITE role for assignTask', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.assignTask,
      );
      expect(role).toBe(ProjectRole.WRITE);
    });

    it('should require WRITE role for unassignTask', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.unassignTask,
      );
      expect(role).toBe(ProjectRole.WRITE);
    });
  });
});
