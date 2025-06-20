import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';

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
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
        status: TaskStatus.IN_PROGRESS,
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
      const updateTaskDto: UpdateTaskDto = { title: 'Updated Task' };

      (tasksService.update as jest.Mock).mockResolvedValue(mockTask);

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
});
