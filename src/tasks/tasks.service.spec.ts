import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { I18nService } from 'nestjs-i18n';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CustomLogger } from '../common/services/logger.service';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { ProjectsService } from '../projects/projects.service';
import { TaskStatusService } from './services/task-status.service';

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockI18nService = {
  t: jest.fn(),
};

const mockLogger = {
  setContext: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

const mockProjectsService = {
  getContributors: jest.fn(),
};

const mockTaskStatusService = {
  validateAndThrowIfInvalid: jest.fn(),
};

const mockQueryBuilder = {
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn(),
};

const mockTask: Task = {
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
  project: undefined,
  assignee: undefined,
};

const mockContributors = [
  { userId: 'user-1', role: 'WRITE' },
  { userId: 'user-2', role: 'READ' },
  { userId: 'user-3', role: 'ADMIN' },
];

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: mockRepository },
        { provide: I18nService, useValue: mockI18nService },
        { provide: CustomLogger, useValue: mockLogger },
        { provide: ProjectsService, useValue: mockProjectsService },
        { provide: TaskStatusService, useValue: mockTaskStatusService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new task successfully', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Task Description',
        priority: TaskPriority.HIGH,
        dueDate: '2025-02-01T00:00:00.000Z',
        assigneeId: 'user-1',
      };
      const projectId = 'project-1';
      const createdTask = { ...mockTask, ...createTaskDto, projectId };

      (mockProjectsService.getContributors as jest.Mock).mockResolvedValue(
        mockContributors,
      );
      (mockRepository.create as jest.Mock).mockReturnValue(createdTask);
      (mockRepository.save as jest.Mock).mockResolvedValue(createdTask);
      (mockRepository.findOne as jest.Mock).mockResolvedValue(createdTask);

      const result = await service.create(createTaskDto, projectId);

      expect(result).toEqual(createdTask);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createTaskDto,
        projectId,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(createdTask);
      expect(mockProjectsService.getContributors).toHaveBeenCalledWith(
        projectId,
        undefined,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Creating task "${createTaskDto.title}" for project ${projectId}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Task created successfully with id: ${createdTask.id}`,
      );
    });

    it('should create a task without assignee successfully', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Task Description',
      };
      const projectId = 'project-1';
      const createdTask = {
        ...mockTask,
        ...createTaskDto,
        projectId,
        assigneeId: undefined,
      };

      (mockRepository.create as jest.Mock).mockReturnValue(createdTask);
      (mockRepository.save as jest.Mock).mockResolvedValue(createdTask);
      (mockRepository.findOne as jest.Mock).mockResolvedValue(createdTask);

      const result = await service.create(createTaskDto, projectId);

      expect(result).toEqual(createdTask);
      expect(mockProjectsService.getContributors).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when assignee is not a project contributor', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Task Description',
        assigneeId: 'non-contributor',
      };
      const projectId = 'project-1';

      (mockProjectsService.getContributors as jest.Mock).mockResolvedValue(
        mockContributors,
      );
      (mockI18nService.t as jest.Mock).mockReturnValue(
        'User is not a contributor',
      );

      await expect(service.create(createTaskDto, projectId)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockProjectsService.getContributors).toHaveBeenCalledWith(
        projectId,
        undefined,
      );
      expect(mockI18nService.t).toHaveBeenCalledWith(
        'errors.tasks.assignee_not_contributor',
        {
          lang: undefined,
          args: { assigneeId: 'non-contributor', projectId: 'project-1' },
        },
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User non-contributor is not a contributor to project project-1',
      );
    });

    it('should throw BadRequestException when assignee has insufficient role (READ)', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Task Description',
        assigneeId: 'user-2', // READ role
      };
      const projectId = 'project-1';

      (mockProjectsService.getContributors as jest.Mock).mockResolvedValue(
        mockContributors,
      );
      (mockI18nService.t as jest.Mock).mockReturnValue(
        'User has insufficient role',
      );

      await expect(service.create(createTaskDto, projectId)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockProjectsService.getContributors).toHaveBeenCalledWith(
        projectId,
        undefined,
      );
      expect(mockI18nService.t).toHaveBeenCalledWith(
        'errors.tasks.assignee_insufficient_role',
        {
          lang: undefined,
          args: { assigneeId: 'user-2', projectId: 'project-1', role: 'READ' },
        },
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User user-2 has insufficient role (READ) to be assigned tasks in project project-1',
      );
    });

    it('should allow assignment to users with WRITE role', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Task Description',
        assigneeId: 'user-1', // WRITE role
      };
      const projectId = 'project-1';
      const createdTask = { ...mockTask, ...createTaskDto, projectId };

      (mockProjectsService.getContributors as jest.Mock).mockResolvedValue(
        mockContributors,
      );
      (mockRepository.create as jest.Mock).mockReturnValue(createdTask);
      (mockRepository.save as jest.Mock).mockResolvedValue(createdTask);
      (mockRepository.findOne as jest.Mock).mockResolvedValue(createdTask);

      const result = await service.create(createTaskDto, projectId);

      expect(result).toEqual(createdTask);
      expect(mockProjectsService.getContributors).toHaveBeenCalledWith(
        projectId,
        undefined,
      );
    });

    it('should allow assignment to users with ADMIN role', async () => {
      const createTaskDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Task Description',
        assigneeId: 'user-3', // ADMIN role
      };
      const projectId = 'project-1';
      const createdTask = { ...mockTask, ...createTaskDto, projectId };

      (mockProjectsService.getContributors as jest.Mock).mockResolvedValue(
        mockContributors,
      );
      (mockRepository.create as jest.Mock).mockReturnValue(createdTask);
      (mockRepository.save as jest.Mock).mockResolvedValue(createdTask);
      (mockRepository.findOne as jest.Mock).mockResolvedValue(createdTask);

      const result = await service.create(createTaskDto, projectId);

      expect(result).toEqual(createdTask);
      expect(mockProjectsService.getContributors).toHaveBeenCalledWith(
        projectId,
        undefined,
      );
    });
  });

  describe('findAll', () => {
    it('should return all tasks for a project', async () => {
      const projectId = 'project-1';
      const tasks = [mockTask];
      (mockRepository.find as jest.Mock).mockResolvedValue(tasks);
      const result = await service.findAll(projectId);
      expect(result).toEqual(tasks);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { projectId },
        relations: ['assignee'],
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Finding all tasks for project ${projectId}`,
      );
    });
  });

  describe('findOne', () => {
    it('should return a task by id and projectId', async () => {
      (mockRepository.findOne as jest.Mock).mockResolvedValue(mockTask);
      const result = await service.findOne('task-1', 'project-1', 'en-US');
      expect(result).toEqual(mockTask);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-1', projectId: 'project-1' },
        relations: ['assignee'],
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Finding task with id: task-1 for project project-1',
      );
    });
    it('should throw NotFoundException when task not found', async () => {
      (mockRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockI18nService.t as jest.Mock).mockReturnValue('not found');
      await expect(
        service.findOne('missing', 'project-1', 'en-US'),
      ).rejects.toThrow(NotFoundException);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Task not found with id: missing for project project-1',
      );
      expect(mockI18nService.t).toHaveBeenCalledWith(
        'errors.tasks.task_not_found',
        {
          lang: 'en-US',
          args: { id: 'missing', projectId: 'project-1' },
        },
      );
    });
  });

  describe('update', () => {
    it('should update a task successfully', async () => {
      const updateTaskDto: UpdateTaskDto = { title: 'Updated Task' };
      const mergedTask = { ...mockTask, ...updateTaskDto };
      (mockRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(mockTask) // First call from findOne in update method
        .mockResolvedValueOnce(mergedTask); // Second call to reload with relations
      (mockRepository.merge as jest.Mock).mockReturnValue(mergedTask);
      (mockRepository.save as jest.Mock).mockResolvedValue(mergedTask);
      const result = await service.update(
        'task-1',
        'project-1',
        updateTaskDto,
        'en-US',
      );
      expect(result).toEqual(mergedTask);
      expect(mockRepository.merge).toHaveBeenCalledWith(
        mockTask,
        updateTaskDto,
      );
      expect(mockRepository.save).toHaveBeenCalledWith(mergedTask);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Updating task task-1 from project project-1 with data: ${JSON.stringify(updateTaskDto)}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Task task-1 updated successfully',
      );
    });

    it('should throw NotFoundException when updating a missing task', async () => {
      (mockRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockI18nService.t as jest.Mock).mockReturnValue('not found');
      await expect(
        service.update('missing', 'project-1', { title: 'X' }, 'en-US'),
      ).rejects.toThrow(NotFoundException);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Task not found with id: missing for project project-1',
      );
      expect(mockI18nService.t).toHaveBeenCalledWith(
        'errors.tasks.task_not_found',
        {
          lang: 'en-US',
          args: { id: 'missing', projectId: 'project-1' },
        },
      );
    });
  });

  describe('remove', () => {
    it('should remove a task successfully', async () => {
      (mockRepository.delete as jest.Mock).mockResolvedValue({ affected: 1 });
      await service.remove('task-1', 'project-1', 'en-US');
      expect(mockRepository.delete).toHaveBeenCalledWith({
        id: 'task-1',
        projectId: 'project-1',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Deleting task task-1 from project project-1',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Task task-1 deleted successfully',
      );
    });
    it('should throw NotFoundException when removing a missing task', async () => {
      (mockRepository.delete as jest.Mock).mockResolvedValue({ affected: 0 });
      (mockI18nService.t as jest.Mock).mockReturnValue('not found');
      await expect(
        service.remove('missing', 'project-1', 'en-US'),
      ).rejects.toThrow(NotFoundException);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Task not found for deletion with id: missing for project project-1',
      );
      expect(mockI18nService.t).toHaveBeenCalledWith(
        'errors.tasks.task_not_found',
        {
          lang: 'en-US',
          args: { id: 'missing', projectId: 'project-1' },
        },
      );
    });
  });

  describe('updateStatus', () => {
    it('should update task status successfully when user is assignee', async () => {
      const updateTaskStatusDto: UpdateTaskStatusDto = {
        status: TaskStatus.IN_PROGRESS,
      };
      const userId = 'user-1';
      const updatedTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };

      (mockRepository.findOne as jest.Mock).mockResolvedValue(mockTask);
      (
        mockTaskStatusService.validateAndThrowIfInvalid as jest.Mock
      ).mockReturnValue(undefined);
      (mockRepository.save as jest.Mock).mockResolvedValue(updatedTask);

      const result = await service.updateStatus(
        'task-1',
        'project-1',
        updateTaskStatusDto,
        userId,
        'en-US',
      );

      expect(result).toEqual(updatedTask);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-1', projectId: 'project-1' },
        relations: ['assignee'],
      });
      expect(
        mockTaskStatusService.validateAndThrowIfInvalid,
      ).toHaveBeenCalledWith(TaskStatus.TODO, TaskStatus.IN_PROGRESS);
      expect(mockRepository.save).toHaveBeenCalledWith(updatedTask);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Updating status for task task-1 from project project-1 to IN_PROGRESS by user user-1',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Task task-1 status updated successfully from TODO to IN_PROGRESS',
      );
    });

    it('should throw ForbiddenException when user is not the assignee', async () => {
      const updateTaskStatusDto: UpdateTaskStatusDto = {
        status: TaskStatus.IN_PROGRESS,
      };
      const userId = 'user-2'; // Different from assigneeId

      (mockRepository.findOne as jest.Mock).mockResolvedValue(mockTask);
      (mockI18nService.t as jest.Mock).mockReturnValue(
        'Only assignee can update status',
      );

      await expect(
        service.updateStatus(
          'task-1',
          'project-1',
          updateTaskStatusDto,
          userId,
          'en-US',
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User user-2 attempted to update status for task task-1 but is not the assignee (assignee: user-1)',
      );
      expect(mockI18nService.t).toHaveBeenCalledWith(
        'errors.tasks.only_assignee_can_update_status',
        {
          lang: 'en-US',
          args: { taskId: 'task-1' },
        },
      );
    });

    it('should throw NotFoundException when task not found', async () => {
      const updateTaskStatusDto: UpdateTaskStatusDto = {
        status: TaskStatus.IN_PROGRESS,
      };
      const userId = 'user-1';

      (mockRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockI18nService.t as jest.Mock).mockReturnValue('not found');

      await expect(
        service.updateStatus(
          'missing',
          'project-1',
          updateTaskStatusDto,
          userId,
          'en-US',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when status transition is invalid', async () => {
      const updateTaskStatusDto: UpdateTaskStatusDto = {
        status: TaskStatus.IN_PROGRESS,
      };
      const userId = 'user-1';

      (mockRepository.findOne as jest.Mock).mockResolvedValue(mockTask);
      (
        mockTaskStatusService.validateAndThrowIfInvalid as jest.Mock
      ).mockImplementation(() => {
        throw new BadRequestException('Invalid status transition');
      });

      await expect(
        service.updateStatus(
          'task-1',
          'project-1',
          updateTaskStatusDto,
          userId,
          'en-US',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignTask', () => {
    it('should assign task successfully to valid assignee', async () => {
      const assigneeId = 'user-1'; // WRITE role
      const assignedTask = { ...mockTask, assigneeId };

      (mockRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(mockTask) // First call from findOne in assignTask method
        .mockResolvedValueOnce(assignedTask); // Second call to reload with relations
      (mockProjectsService.getContributors as jest.Mock).mockResolvedValue(
        mockContributors,
      );
      (mockRepository.save as jest.Mock).mockResolvedValue(assignedTask);

      const result = await service.assignTask(
        'task-1',
        'project-1',
        assigneeId,
        'en-US',
      );

      expect(result).toEqual(assignedTask);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-1', projectId: 'project-1' },
        relations: ['assignee'],
      });
      expect(mockProjectsService.getContributors).toHaveBeenCalledWith(
        'project-1',
        'en-US',
      );
      expect(mockRepository.save).toHaveBeenCalledWith(assignedTask);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Assigning task task-1 from project project-1 to user user-1',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Task task-1 assigned successfully to user user-1',
      );
    });

    it('should throw BadRequestException when assigning to non-contributor', async () => {
      const assigneeId = 'non-contributor';

      (mockRepository.findOne as jest.Mock).mockResolvedValue(mockTask);
      (mockProjectsService.getContributors as jest.Mock).mockResolvedValue(
        mockContributors,
      );
      (mockI18nService.t as jest.Mock).mockReturnValue(
        'User is not a contributor',
      );

      await expect(
        service.assignTask('task-1', 'project-1', assigneeId, 'en-US'),
      ).rejects.toThrow(BadRequestException);

      expect(mockI18nService.t).toHaveBeenCalledWith(
        'errors.tasks.assignee_not_contributor',
        {
          lang: 'en-US',
          args: { assigneeId: 'non-contributor', projectId: 'project-1' },
        },
      );
    });

    it('should throw BadRequestException when assigning to user with insufficient role (READ)', async () => {
      const assigneeId = 'user-2'; // READ role

      (mockRepository.findOne as jest.Mock).mockResolvedValue(mockTask);
      (mockProjectsService.getContributors as jest.Mock).mockResolvedValue(
        mockContributors,
      );
      (mockI18nService.t as jest.Mock).mockReturnValue(
        'User has insufficient role',
      );

      await expect(
        service.assignTask('task-1', 'project-1', assigneeId, 'en-US'),
      ).rejects.toThrow(BadRequestException);

      expect(mockI18nService.t).toHaveBeenCalledWith(
        'errors.tasks.assignee_insufficient_role',
        {
          lang: 'en-US',
          args: { assigneeId: 'user-2', projectId: 'project-1', role: 'READ' },
        },
      );
    });

    it('should throw NotFoundException when task not found', async () => {
      const assigneeId = 'user-1';

      (mockRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockI18nService.t as jest.Mock).mockReturnValue('not found');

      await expect(
        service.assignTask('missing', 'project-1', assigneeId, 'en-US'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchTasks', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (mockRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );
    });

    it('should search tasks with multiple filters', async () => {
      const projectId = 'project-1';
      const searchDto = {
        query: 'test',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assigneeId: 'user-1',
        page: 1,
        limit: 10,
      };
      const tasks = [mockTask];

      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        1,
      ]);

      const result = await service.searchTasks(projectId, searchDto);

      expect(result).toEqual({ tasks, total: 1, page: 1, limit: 10 });
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('task');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.projectId = :projectId',
        { projectId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(task.title ILIKE :query OR task.description ILIKE :query)',
        { query: `%${searchDto.query}%` },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status = :status',
        { status: searchDto.status },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.priority = :priority',
        { priority: searchDto.priority },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.assigneeId = :assigneeId',
        { assigneeId: searchDto.assigneeId },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'task.createdAt',
        'DESC',
      );
    });

    it('should handle search with no filters', async () => {
      const projectId = 'project-1';
      const searchDto = { page: 2, limit: 20 };
      const tasks = [mockTask, { ...mockTask, id: 'task-2' }];

      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        2,
      ]);

      const result = await service.searchTasks(projectId, searchDto);

      expect(result).toEqual({ tasks, total: 2, page: 2, limit: 20 });
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.any(Object),
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('should return empty results when no tasks match', async () => {
      const projectId = 'project-1';
      const searchDto = { query: 'nonexistent', page: 1, limit: 10 };

      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        [],
        0,
      ]);

      const result = await service.searchTasks(projectId, searchDto);

      expect(result).toEqual({ tasks: [], total: 0, page: 1, limit: 10 });
    });
  });
});
