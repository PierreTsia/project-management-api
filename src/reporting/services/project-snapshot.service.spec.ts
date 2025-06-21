import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProjectSnapshotService } from './project-snapshot.service';
import { ProjectSnapshot } from '../entities/project-snapshot.entity';
import { ProjectsService } from '../../projects/projects.service';
import { TasksService } from '../../tasks/tasks.service';
import { CommentsService } from '../../tasks/services/comments.service';
import { AttachmentsService } from '../../attachments/attachments.service';
import { CustomLogger } from '../../common/services/logger.service';
import { TaskStatus } from '../../tasks/enums/task-status.enum';

describe('ProjectSnapshotService', () => {
  let service: ProjectSnapshotService;

  const mockSnapshotRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    manager: {
      getRepository: jest.fn(),
    },
  };

  const mockProjectsService = {
    findAllActive: jest.fn(),
  };

  const mockTasksService = {
    findAll: jest.fn(),
  };

  const mockCommentsService = {
    getCommentsCountForProjectAndDateRange: jest.fn(),
  };

  const mockAttachmentsService = {
    getAttachmentsCountForProjectAndDateRange: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  const mockProjectRepository = {
    find: jest.fn(),
  };

  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.TODO,
    priority: 'MEDIUM',
    projectId: 'project-1',
    assigneeId: 'user-1',
    createdAt: new Date('2024-01-14T10:00:00Z'),
    updatedAt: new Date('2024-01-14T10:00:00Z'),
  };

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test Description',
    status: 'ACTIVE',
    ownerId: 'user-1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectSnapshotService,
        {
          provide: getRepositoryToken(ProjectSnapshot),
          useValue: mockSnapshotRepository,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
        {
          provide: AttachmentsService,
          useValue: mockAttachmentsService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ProjectSnapshotService>(ProjectSnapshotService);

    // Setup default mock implementations
    mockSnapshotRepository.manager.getRepository.mockReturnValue(
      mockProjectRepository,
    );
    mockProjectRepository.find.mockResolvedValue([mockProject]);
    mockTasksService.findAll.mockResolvedValue([mockTask]);
    mockCommentsService.getCommentsCountForProjectAndDateRange.mockResolvedValue(
      5,
    );
    mockAttachmentsService.getAttachmentsCountForProjectAndDateRange.mockResolvedValue(
      3,
    );
    mockSnapshotRepository.save.mockResolvedValue({
      id: 'snapshot-1',
      projectId: 'project-1',
      snapshotDate: new Date('2024-01-15'),
      totalTasks: 1,
      completedTasks: 0,
      inProgressTasks: 0,
      todoTasks: 1,
      newTasksToday: 0,
      completedTasksToday: 0,
      commentsAddedToday: 5,
      attachmentsUploadedToday: 3,
      completionPercentage: 0,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDailySnapshots', () => {
    it('should generate snapshots for all active projects successfully', async () => {
      // Arrange
      const projects = [mockProject, { ...mockProject, id: 'project-2' }];
      mockProjectRepository.find.mockResolvedValue(projects);

      // Act
      await service.generateDailySnapshots();

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Starting daily project snapshots generation...',
      );
      expect(mockProjectRepository.find).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Found 2 active projects for snapshot generation',
      );
      expect(mockSnapshotRepository.save).toHaveBeenCalledTimes(2);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Daily snapshot generation completed. Success: 2, Errors: 0',
      );
    });

    it('should handle errors during snapshot generation for individual projects', async () => {
      // Arrange
      const projects = [mockProject, { ...mockProject, id: 'project-2' }];
      mockProjectRepository.find.mockResolvedValue(projects);
      mockTasksService.findAll.mockRejectedValueOnce(
        new Error('Database error'),
      );

      // Act
      await service.generateDailySnapshots();

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Starting daily project snapshots generation...',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to generate snapshot for project project-1:',
        expect.any(String),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Daily snapshot generation completed. Success: 1, Errors: 1',
      );
    });

    it('should handle critical errors during snapshot generation', async () => {
      // Arrange
      mockProjectRepository.find.mockRejectedValue(
        new Error('Critical database error'),
      );

      // Act
      await service.generateDailySnapshots();

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Starting daily project snapshots generation...',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Critical error during daily snapshots generation',
        expect.any(String),
      );
    });
  });

  describe('calculateProjectMetrics', () => {
    it('should calculate metrics correctly for a project with various task statuses', async () => {
      // Arrange
      const projectId = 'project-1';
      const date = new Date('2024-01-15');
      const tasks = [
        {
          ...mockTask,
          status: TaskStatus.DONE,
          updatedAt: new Date('2024-01-15T12:00:00Z'),
        },
        {
          ...mockTask,
          id: 'task-2',
          status: TaskStatus.IN_PROGRESS,
          createdAt: new Date('2024-01-14T10:00:00Z'),
        },
        {
          ...mockTask,
          id: 'task-3',
          status: TaskStatus.TODO,
          createdAt: new Date('2024-01-14T10:00:00Z'),
        },
        {
          ...mockTask,
          id: 'task-4',
          status: TaskStatus.TODO,
          createdAt: new Date('2024-01-15T14:00:00Z'),
        },
      ];

      mockTasksService.findAll.mockResolvedValue(tasks);

      // Act
      const result = await (service as any).calculateProjectMetrics(
        projectId,
        date,
      );

      // Assert
      expect(result.totalTasks).toBe(4);
      expect(result.completedTasks).toBe(1);
      expect(result.inProgressTasks).toBe(1);
      expect(result.todoTasks).toBe(2);
      expect(result.newTasksToday).toBe(1);
      expect(result.completedTasksToday).toBe(1);
      expect(result.completionPercentage).toBe(25);
      expect(result.commentsAddedToday).toBe(5);
      expect(result.attachmentsUploadedToday).toBe(3);
    });

    it('should handle empty task list', async () => {
      // Arrange
      const projectId = 'project-1';
      const date = new Date('2024-01-15');
      mockTasksService.findAll.mockResolvedValue([]);

      // Act
      const result = await (service as any).calculateProjectMetrics(
        projectId,
        date,
      );

      // Assert
      expect(result.totalTasks).toBe(0);
      expect(result.completedTasks).toBe(0);
      expect(result.inProgressTasks).toBe(0);
      expect(result.todoTasks).toBe(0);
      expect(result.newTasksToday).toBe(0);
      expect(result.completedTasksToday).toBe(0);
      expect(result.completionPercentage).toBe(0);
    });

    it('should calculate completion percentage correctly', async () => {
      // Arrange
      const projectId = 'project-1';
      const date = new Date('2024-01-15');
      const tasks = [
        { ...mockTask, status: TaskStatus.DONE },
        { ...mockTask, id: 'task-2', status: TaskStatus.DONE },
        { ...mockTask, id: 'task-3', status: TaskStatus.IN_PROGRESS },
      ];

      mockTasksService.findAll.mockResolvedValue(tasks);

      // Act
      const result = await (service as any).calculateProjectMetrics(
        projectId,
        date,
      );

      // Assert
      expect(result.totalTasks).toBe(3);
      expect(result.completedTasks).toBe(2);
      expect(result.completionPercentage).toBeCloseTo(66.67, 1);
    });
  });

  describe('getCommentsCountForDate', () => {
    it('should return comments count successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');
      const expectedCount = 10;

      mockCommentsService.getCommentsCountForProjectAndDateRange.mockResolvedValue(
        expectedCount,
      );

      // Act
      const result = await (service as any).getCommentsCountForDate(
        projectId,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toBe(expectedCount);
      expect(
        mockCommentsService.getCommentsCountForProjectAndDateRange,
      ).toHaveBeenCalledWith(projectId, startDate, endDate);
    });

    it('should return 0 when comments service throws an error', async () => {
      // Arrange
      const projectId = 'project-1';
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      mockCommentsService.getCommentsCountForProjectAndDateRange.mockRejectedValue(
        new Error('Comments service error'),
      );

      // Act
      const result = await (service as any).getCommentsCountForDate(
        projectId,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get comments count for project project-1:',
        expect.any(String),
      );
    });
  });

  describe('getAttachmentsCountForDate', () => {
    it('should return attachments count successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');
      const expectedCount = 7;

      mockAttachmentsService.getAttachmentsCountForProjectAndDateRange.mockResolvedValue(
        expectedCount,
      );

      // Act
      const result = await (service as any).getAttachmentsCountForDate(
        projectId,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toBe(expectedCount);
      expect(
        mockAttachmentsService.getAttachmentsCountForProjectAndDateRange,
      ).toHaveBeenCalledWith(projectId, startDate, endDate);
    });

    it('should return 0 when attachments service throws an error', async () => {
      // Arrange
      const projectId = 'project-1';
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      mockAttachmentsService.getAttachmentsCountForProjectAndDateRange.mockRejectedValue(
        new Error('Attachments service error'),
      );

      // Act
      const result = await (service as any).getAttachmentsCountForDate(
        projectId,
        startDate,
        endDate,
      );

      // Assert
      expect(result).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get attachments count for project project-1:',
        expect.any(String),
      );
    });
  });

  describe('generateSnapshotForProject', () => {
    it('should generate and save snapshot successfully', async () => {
      // Arrange
      const projectId = 'project-1';
      const date = new Date('2024-01-15');
      const expectedSnapshot = {
        id: 'snapshot-1',
        projectId,
        snapshotDate: date,
        totalTasks: 1,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 1,
        newTasksToday: 0,
        completedTasksToday: 0,
        commentsAddedToday: 5,
        attachmentsUploadedToday: 3,
        completionPercentage: 0,
      };

      mockSnapshotRepository.findOne.mockResolvedValue(null);
      mockSnapshotRepository.save.mockResolvedValue(expectedSnapshot);

      // Act
      await (service as any).generateSnapshotForProject(projectId, date);

      // Assert
      expect(mockSnapshotRepository.save).toHaveBeenCalledWith({
        projectId,
        snapshotDate: date,
        totalTasks: 1,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 1,
        newTasksToday: 0,
        completedTasksToday: 0,
        commentsAddedToday: 5,
        attachmentsUploadedToday: 3,
        completionPercentage: 0,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Created new snapshot for project ${projectId} with ID: ${expectedSnapshot.id}`,
      );
    });

    it('should handle errors during snapshot generation', async () => {
      // Arrange
      const projectId = 'project-1';
      const date = new Date('2024-01-15');
      const error = new Error('Snapshot generation failed');

      mockTasksService.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(
        (service as any).generateSnapshotForProject(projectId, date),
      ).rejects.toThrow('Snapshot generation failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error generating snapshot for project ${projectId}:`,
        expect.any(String),
      );
    });

    it('should update existing snapshot instead of creating duplicate (regression test)', async () => {
      // Arrange
      const projectId = 'project-1';
      const date = new Date('2024-01-15');
      const existingSnapshot = {
        id: 'existing-snapshot-1',
        projectId,
        snapshotDate: date,
        totalTasks: 1,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 1,
        newTasksToday: 0,
        completedTasksToday: 0,
        commentsAddedToday: 2,
        attachmentsUploadedToday: 1,
        completionPercentage: 0,
      };

      mockSnapshotRepository.findOne.mockResolvedValue(existingSnapshot);
      mockSnapshotRepository.update.mockResolvedValue({ affected: 1 });

      // Act
      await (service as any).generateSnapshotForProject(projectId, date);

      // Assert
      expect(mockSnapshotRepository.findOne).toHaveBeenCalledWith({
        where: { projectId, snapshotDate: date },
      });
      expect(mockSnapshotRepository.update).toHaveBeenCalledWith(
        existingSnapshot.id,
        {
          totalTasks: 1,
          completedTasks: 0,
          inProgressTasks: 0,
          todoTasks: 1,
          newTasksToday: 0,
          completedTasksToday: 0,
          commentsAddedToday: 5,
          attachmentsUploadedToday: 3,
          completionPercentage: 0,
        },
      );
      expect(mockSnapshotRepository.save).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Updated existing snapshot for project ${projectId} with ID: ${existingSnapshot.id}`,
      );
    });

    it('should create new snapshot when none exists for the project and date', async () => {
      // Arrange
      const projectId = 'project-1';
      const date = new Date('2024-01-15');
      const expectedSnapshot = {
        id: 'new-snapshot-1',
        projectId,
        snapshotDate: date,
        totalTasks: 1,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 1,
        newTasksToday: 0,
        completedTasksToday: 0,
        commentsAddedToday: 5,
        attachmentsUploadedToday: 3,
        completionPercentage: 0,
      };

      mockSnapshotRepository.findOne.mockResolvedValue(null);
      mockSnapshotRepository.save.mockResolvedValue(expectedSnapshot);

      // Act
      await (service as any).generateSnapshotForProject(projectId, date);

      // Assert
      expect(mockSnapshotRepository.findOne).toHaveBeenCalledWith({
        where: { projectId, snapshotDate: date },
      });
      expect(mockSnapshotRepository.save).toHaveBeenCalledWith({
        projectId,
        snapshotDate: date,
        totalTasks: 1,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 1,
        newTasksToday: 0,
        completedTasksToday: 0,
        commentsAddedToday: 5,
        attachmentsUploadedToday: 3,
        completionPercentage: 0,
      });
      expect(mockSnapshotRepository.update).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Created new snapshot for project ${projectId} with ID: ${expectedSnapshot.id}`,
      );
    });
  });
});
