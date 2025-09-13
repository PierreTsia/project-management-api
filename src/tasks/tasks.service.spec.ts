import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { GlobalSearchTasksDto } from './dto/global-search-tasks.dto';
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

const mockTransactionalEntityManager = {
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
  manager: {
    transaction: jest.fn(),
  },
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
  findAll: jest.fn(),
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
  addOrderBy: jest.fn().mockReturnThis(),
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
      (mockRepository.findOne as jest.Mock).mockResolvedValue(mockTask);
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

  describe('unassignTask', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should unassign task successfully', async () => {
      const taskWithAssignee = {
        ...mockTask,
        assigneeId: 'user-1',
        assignee: { id: 'user-1', name: 'User 1' },
      };

      (mockRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(taskWithAssignee) // First call from findOne in unassignTask method
        .mockResolvedValueOnce({
          ...taskWithAssignee,
          assigneeId: null,
          assignee: null,
        }); // Second call after save

      const unassignedTask = {
        ...taskWithAssignee,
        assigneeId: null,
        assignee: null,
      };
      (mockRepository.save as jest.Mock).mockResolvedValue(unassignedTask);

      const result = await service.unassignTask('task-1', 'project-1', 'en-US');

      expect(result).toEqual(unassignedTask);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-1', projectId: 'project-1' },
        relations: ['assignee'],
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...taskWithAssignee,
        assigneeId: null,
        assignee: undefined,
      });
    });

    it('should handle unassigning already unassigned task', async () => {
      const unassignedTask = {
        ...mockTask,
        assigneeId: null,
        assignee: null,
      };

      (mockRepository.findOne as jest.Mock).mockResolvedValue(unassignedTask);
      (mockRepository.save as jest.Mock).mockResolvedValue(unassignedTask);

      const result = await service.unassignTask('task-1', 'project-1', 'en-US');

      expect(result).toEqual(unassignedTask);
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...unassignedTask,
        assigneeId: null,
        assignee: undefined,
      });
    });

    it('should throw NotFoundException if task does not exist', async () => {
      (mockRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockI18nService.t as jest.Mock).mockReturnValue('not found');

      await expect(
        service.unassignTask('missing', 'project-1', 'en-US'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle different accept-language', async () => {
      const taskWithAssignee = {
        ...mockTask,
        assigneeId: 'user-1',
        assignee: { id: 'user-1', name: 'User 1' },
      };

      (mockRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(taskWithAssignee) // First call from findOne in unassignTask method
        .mockResolvedValueOnce({
          ...taskWithAssignee,
          assigneeId: null,
          assignee: null,
        }); // Second call after save (reload with relations)
      const unassignedTask = {
        ...taskWithAssignee,
        assigneeId: null,
        assignee: null,
      };
      (mockRepository.save as jest.Mock).mockResolvedValue(unassignedTask);

      const result = await service.unassignTask('task-1', 'project-1', 'fr-FR');

      expect(result).toEqual(unassignedTask);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-1', projectId: 'project-1' },
        relations: ['assignee'],
      });
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

  describe('findAllUserTasks', () => {
    it('should return all user tasks across projects', async () => {
      const userId = 'user-1';
      const searchDto = { page: 1, limit: 10 };
      const projects = [
        { id: 'project-1', name: 'Project 1' },
        { id: 'project-2', name: 'Project 2' },
      ];
      const tasks = [
        mockTask,
        { ...mockTask, id: 'task-2', projectId: 'project-2' },
      ];

      (mockProjectsService.findAll as jest.Mock).mockResolvedValue(projects);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        2,
      ]);

      const result = await service.findAllUserTasks(userId, searchDto);

      expect(result).toEqual({
        tasks,
        total: 2,
        page: 1,
        limit: 10,
      });
      expect(mockProjectsService.findAll).toHaveBeenCalledWith(userId);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('task');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.projectId IN (:...projectIds)',
        { projectIds: ['project-1', 'project-2'] },
      );
    });

    it('should return empty results when user has no projects', async () => {
      const userId = 'user-1';
      const searchDto = { page: 1, limit: 10 };

      (mockProjectsService.findAll as jest.Mock).mockResolvedValue([]);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        [],
        0,
      ]);

      const result = await service.findAllUserTasks(userId, searchDto);

      expect(result).toEqual({
        tasks: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('searchAllUserTasks', () => {
    it('should search tasks across all user projects with filters', async () => {
      const userId = 'user-1';
      const searchDto: GlobalSearchTasksDto = {
        query: 'test',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assigneeId: 'user-1',
        page: 1,
        limit: 10,
        sortBy: 'dueDate',
        sortOrder: 'ASC',
      };
      const projects = [
        { id: 'project-1', name: 'Project 1' },
        { id: 'project-2', name: 'Project 2' },
      ];
      const tasks = [mockTask];

      (mockProjectsService.findAll as jest.Mock).mockResolvedValue(projects);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        1,
      ]);

      const result = await service.searchAllUserTasks(userId, searchDto);

      expect(result).toEqual({
        tasks,
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(mockProjectsService.findAll).toHaveBeenCalledWith(userId);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('task');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.projectId IN (:...projectIds)',
        { projectIds: ['project-1', 'project-2'] },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(task.title ILIKE :query OR task.description ILIKE :query)',
        { query: '%test%' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status = :status',
        { status: TaskStatus.IN_PROGRESS },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.priority = :priority',
        { priority: TaskPriority.HIGH },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.assigneeId = :assigneeId',
        { assigneeId: 'user-1' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'task.dueDate',
        'ASC',
      );
    });

    it('should handle assigneeFilter=me', async () => {
      const userId = 'user-1';
      const searchDto: GlobalSearchTasksDto = {
        assigneeFilter: 'me',
        page: 1,
        limit: 10,
      };
      const projects = [{ id: 'project-1', name: 'Project 1' }];
      const tasks = [mockTask];

      (mockProjectsService.findAll as jest.Mock).mockResolvedValue(projects);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        1,
      ]);

      const result = await service.searchAllUserTasks(userId, searchDto);

      expect(result.tasks).toEqual(tasks);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.assigneeId = :userId',
        { userId: userId },
      );
    });

    it('should handle assigneeFilter=unassigned', async () => {
      const userId = 'user-1';
      const searchDto: GlobalSearchTasksDto = {
        assigneeFilter: 'unassigned',
        page: 1,
        limit: 10,
      };
      const projects = [{ id: 'project-1', name: 'Project 1' }];
      const tasks = [mockTask];

      (mockProjectsService.findAll as jest.Mock).mockResolvedValue(projects);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        1,
      ]);

      const result = await service.searchAllUserTasks(userId, searchDto);

      expect(result.tasks).toEqual(tasks);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.assigneeId IS NULL',
      );
    });

    it('should handle isOverdue filter', async () => {
      const userId = 'user-1';
      const searchDto = {
        isOverdue: true,
        page: 1,
        limit: 10,
      };
      const projects = [{ id: 'project-1', name: 'Project 1' }];
      const tasks = [mockTask];

      (mockProjectsService.findAll as jest.Mock).mockResolvedValue(projects);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        1,
      ]);

      const result = await service.searchAllUserTasks(userId, searchDto);

      expect(result.tasks).toEqual(tasks);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.dueDate < NOW()',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status != :doneStatus',
        { doneStatus: TaskStatus.DONE },
      );
    });

    it('should handle hasDueDate filter', async () => {
      const userId = 'user-1';
      const searchDto = {
        hasDueDate: true,
        page: 1,
        limit: 10,
      };
      const projects = [{ id: 'project-1', name: 'Project 1' }];
      const tasks = [mockTask];

      (mockProjectsService.findAll as jest.Mock).mockResolvedValue(projects);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        1,
      ]);

      const result = await service.searchAllUserTasks(userId, searchDto);

      expect(result.tasks).toEqual(tasks);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.dueDate IS NOT NULL',
      );
    });

    it('should handle date range filters', async () => {
      const userId = 'user-1';
      const searchDto = {
        dueDateFrom: '2025-01-01',
        dueDateTo: '2025-12-31',
        createdFrom: '2025-01-01',
        createdTo: '2025-12-31',
        page: 1,
        limit: 10,
      };
      const projects = [{ id: 'project-1', name: 'Project 1' }];
      const tasks = [mockTask];

      (mockProjectsService.findAll as jest.Mock).mockResolvedValue(projects);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        1,
      ]);

      const result = await service.searchAllUserTasks(userId, searchDto);

      expect(result.tasks).toEqual(tasks);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.dueDate >= :dueDateFrom',
        { dueDateFrom: '2025-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.dueDate <= :dueDateTo',
        { dueDateTo: '2025-12-31' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.createdAt >= :createdFrom',
        { createdFrom: '2025-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.createdAt <= :createdTo',
        { createdTo: '2025-12-31' },
      );
    });

    it('should handle priority sorting', async () => {
      const userId = 'user-1';
      const searchDto: GlobalSearchTasksDto = {
        sortBy: 'priority',
        sortOrder: 'DESC',
        page: 1,
        limit: 10,
      };
      const projects = [{ id: 'project-1', name: 'Project 1' }];
      const tasks = [mockTask];

      (mockProjectsService.findAll as jest.Mock).mockResolvedValue(projects);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        1,
      ]);

      const result = await service.searchAllUserTasks(userId, searchDto);

      expect(result.tasks).toEqual(tasks);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        `CASE 
          WHEN task.priority = 'HIGH' THEN 1 
          WHEN task.priority = 'MEDIUM' THEN 2 
          WHEN task.priority = 'LOW' THEN 3 
          ELSE 4 
        END`,
        'DESC',
      );
    });

    it('should handle status sorting', async () => {
      const userId = 'user-1';
      const searchDto: GlobalSearchTasksDto = {
        sortBy: 'status',
        sortOrder: 'ASC',
        page: 1,
        limit: 10,
      };
      const projects = [{ id: 'project-1', name: 'Project 1' }];
      const tasks = [mockTask];

      (mockProjectsService.findAll as jest.Mock).mockResolvedValue(projects);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        1,
      ]);

      const result = await service.searchAllUserTasks(userId, searchDto);

      expect(result.tasks).toEqual(tasks);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        `CASE 
          WHEN task.status = 'TODO' THEN 1 
          WHEN task.status = 'IN_PROGRESS' THEN 2 
          WHEN task.status = 'DONE' THEN 3 
          ELSE 4 
        END`,
        'ASC',
      );
    });

    it('should handle projectId filter', async () => {
      const userId = 'user-1';
      const searchDto = {
        projectId: 'project-1',
        page: 1,
        limit: 10,
      };
      const projects = [
        { id: 'project-1', name: 'Project 1' },
        { id: 'project-2', name: 'Project 2' },
      ];
      const tasks = [mockTask];

      (mockProjectsService.findAll as jest.Mock).mockResolvedValue(projects);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([
        tasks,
        1,
      ]);

      const result = await service.searchAllUserTasks(userId, searchDto);

      expect(result.tasks).toEqual(tasks);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.projectId = :projectId',
        { projectId: 'project-1' },
      );
    });
  });

  describe('bulkUpdateStatus', () => {
    const userId = 'user-1';
    const bulkUpdateDto = {
      taskIds: ['task-1', 'task-2'],
      status: TaskStatus.DONE,
      reason: 'Completed sprint',
    };

    beforeEach(() => {
      // Mock transaction
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockTransactionalEntityManager);
      });
      (mockRepository.manager.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );
    });

    it('should successfully update status for all tasks when user is assignee', async () => {
      const mockTask1 = {
        id: 'task-1',
        assigneeId: userId,
        status: TaskStatus.IN_PROGRESS,
        project: { contributors: [{ userId }] },
      };
      const mockTask2 = {
        id: 'task-2',
        assigneeId: userId,
        status: TaskStatus.IN_PROGRESS,
        project: { contributors: [{ userId }] },
      };

      (mockTransactionalEntityManager.findOne as jest.Mock)
        .mockResolvedValueOnce(mockTask1)
        .mockResolvedValueOnce(mockTask2);
      (
        mockTaskStatusService.validateAndThrowIfInvalid as jest.Mock
      ).mockReturnValue(undefined);

      const result = await service.bulkUpdateStatus(userId, bulkUpdateDto);

      expect(result.success).toBe(true);
      expect(result.result.successCount).toBe(2);
      expect(result.result.failureCount).toBe(0);
      expect(result.result.successfulTaskIds).toEqual(['task-1', 'task-2']);
      expect(mockTransactionalEntityManager.update).toHaveBeenCalledTimes(2);
    });

    it('should fail when user is not assignee', async () => {
      const mockTask = {
        id: 'task-1',
        assigneeId: 'other-user',
        status: TaskStatus.IN_PROGRESS,
        project: { contributors: [{ userId }] },
      };

      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        mockTask,
      );

      const result = await service.bulkUpdateStatus(userId, bulkUpdateDto);

      expect(result.success).toBe(false);
      expect(result.result.successCount).toBe(0);
      expect(result.result.failureCount).toBe(2);
      expect(result.result.errors).toHaveLength(2);
      expect(result.result.errors[0].error).toBe(
        'Only the assignee can update task status',
      );
    });

    it('should fail when task not found', async () => {
      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.bulkUpdateStatus(userId, bulkUpdateDto);

      expect(result.success).toBe(false);
      expect(result.result.successCount).toBe(0);
      expect(result.result.failureCount).toBe(2);
      expect(result.result.errors[0].error).toBe('Task not found');
    });

    it('should fail when user has no access to project', async () => {
      const mockTask = {
        id: 'task-1',
        assigneeId: userId,
        status: TaskStatus.IN_PROGRESS,
        project: { contributors: [{ userId: 'other-user' }] },
      };

      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        mockTask,
      );

      const result = await service.bulkUpdateStatus(userId, bulkUpdateDto);

      expect(result.success).toBe(false);
      expect(result.result.errors[0].error).toBe('Insufficient permissions');
    });

    it('should fail when status transition is invalid', async () => {
      const mockTask = {
        id: 'task-1',
        assigneeId: userId,
        status: TaskStatus.DONE,
        project: { contributors: [{ userId }] },
      };

      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        mockTask,
      );
      (
        mockTaskStatusService.validateAndThrowIfInvalid as jest.Mock
      ).mockImplementation(() => {
        throw new BadRequestException('Invalid status transition');
      });

      const result = await service.bulkUpdateStatus(userId, bulkUpdateDto);

      expect(result.success).toBe(false);
      expect(result.result.errors[0].error).toBe('Invalid status transition');
    });
  });

  describe('bulkAssignTasks', () => {
    const userId = 'user-1';
    const assigneeId = 'assignee-1';
    const bulkAssignDto = {
      taskIds: ['task-1', 'task-2'],
      assigneeId,
      reason: 'Reassignment',
    };

    beforeEach(() => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockTransactionalEntityManager);
      });
      (mockRepository.manager.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );
    });

    it('should successfully assign tasks when user has WRITE role and assignee is contributor', async () => {
      const mockTask = {
        id: 'task-1',
        project: {
          contributors: [
            { userId, role: 'WRITE' },
            { userId: assigneeId, role: 'READ' },
          ],
        },
      };

      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        mockTask,
      );

      const result = await service.bulkAssignTasks(userId, bulkAssignDto);

      expect(result.success).toBe(true);
      expect(result.result.successCount).toBe(2);
      expect(result.result.failureCount).toBe(0);
      expect(mockTransactionalEntityManager.update).toHaveBeenCalledTimes(2);
    });

    it('should fail when user has insufficient role', async () => {
      const mockTask = {
        id: 'task-1',
        project: {
          contributors: [
            { userId, role: 'READ' },
            { userId: assigneeId, role: 'READ' },
          ],
        },
      };

      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        mockTask,
      );

      const result = await service.bulkAssignTasks(userId, bulkAssignDto);

      expect(result.success).toBe(false);
      expect(result.result.errors[0].error).toBe(
        'Insufficient role to assign tasks',
      );
    });

    it('should fail when assignee is not project contributor', async () => {
      const mockTask = {
        id: 'task-1',
        project: {
          contributors: [{ userId, role: 'WRITE' }],
        },
      };

      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        mockTask,
      );

      const result = await service.bulkAssignTasks(userId, bulkAssignDto);

      expect(result.success).toBe(false);
      expect(result.result.errors[0].error).toBe(
        'Assignee is not a project contributor',
      );
    });

    it('should fail when task not found', async () => {
      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.bulkAssignTasks(userId, bulkAssignDto);

      expect(result.success).toBe(false);
      expect(result.result.errors[0].error).toBe('Task not found');
    });
  });

  describe('bulkDeleteTasks', () => {
    const userId = 'user-1';
    const bulkDeleteDto = {
      taskIds: ['task-1', 'task-2'],
      reason: 'Cleanup',
    };

    beforeEach(() => {
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        return callback(mockTransactionalEntityManager);
      });
      (mockRepository.manager.transaction as jest.Mock).mockImplementation(
        mockTransaction,
      );
    });

    it('should successfully delete tasks when user has ADMIN role', async () => {
      const mockTask = {
        id: 'task-1',
        project: {
          contributors: [{ userId, role: 'ADMIN' }],
        },
      };

      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        mockTask,
      );

      const result = await service.bulkDeleteTasks(userId, bulkDeleteDto);

      expect(result.success).toBe(true);
      expect(result.result.successCount).toBe(2);
      expect(result.result.failureCount).toBe(0);
      expect(mockTransactionalEntityManager.delete).toHaveBeenCalledTimes(2);
    });

    it('should fail when user has insufficient role', async () => {
      const mockTask = {
        id: 'task-1',
        project: {
          contributors: [{ userId, role: 'WRITE' }],
        },
      };

      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        mockTask,
      );

      const result = await service.bulkDeleteTasks(userId, bulkDeleteDto);

      expect(result.success).toBe(false);
      expect(result.result.errors[0].error).toBe(
        'Insufficient role to delete tasks',
      );
    });

    it('should fail when task not found', async () => {
      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await service.bulkDeleteTasks(userId, bulkDeleteDto);

      expect(result.success).toBe(false);
      expect(result.result.errors[0].error).toBe('Task not found');
    });

    it('should fail when user has no access to project', async () => {
      const mockTask = {
        id: 'task-1',
        project: {
          contributors: [{ userId: 'other-user', role: 'ADMIN' }],
        },
      };

      (mockTransactionalEntityManager.findOne as jest.Mock).mockResolvedValue(
        mockTask,
      );

      const result = await service.bulkDeleteTasks(userId, bulkDeleteDto);

      expect(result.success).toBe(false);
      expect(result.result.errors[0].error).toBe('Insufficient permissions');
    });
  });
});
