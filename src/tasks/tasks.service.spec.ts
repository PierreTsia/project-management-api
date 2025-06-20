import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { I18nService } from 'nestjs-i18n';
import { NotFoundException } from '@nestjs/common';
import { CustomLogger } from '../common/services/logger.service';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  merge: jest.fn(),
  delete: jest.fn(),
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

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: mockRepository },
        { provide: I18nService, useValue: mockI18nService },
        { provide: CustomLogger, useValue: mockLogger },
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
        assigneeId: 'user-2',
      };
      const projectId = 'project-1';
      const createdTask = { ...mockTask, ...createTaskDto, projectId };
      (mockRepository.create as jest.Mock).mockReturnValue(createdTask);
      (mockRepository.save as jest.Mock).mockResolvedValue(createdTask);

      const result = await service.create(createTaskDto, projectId);

      expect(result).toEqual(createdTask);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createTaskDto,
        projectId,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(createdTask);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Creating task "${createTaskDto.title}" for project ${projectId}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Task created successfully with id: ${createdTask.id}`,
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
});
