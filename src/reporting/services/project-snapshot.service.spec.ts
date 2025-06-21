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

// Test type for snapshots without entity relationships
type TestSnapshot = Omit<ProjectSnapshot, 'project' | 'createdAt'> & {
  createdAt?: Date;
  project?: any;
};

describe('ProjectSnapshotService', () => {
  let service: ProjectSnapshotService;

  const mockSnapshotRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
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

  const mockSnapshot: TestSnapshot = {
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
    mockSnapshotRepository.save.mockResolvedValue(mockSnapshot);
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

  describe('generateHistoricalSnapshots', () => {
    it('should generate historical snapshots for specified days', async () => {
      // Arrange
      const projectId = 'project-1';
      const days = 3;
      mockSnapshotRepository.findOne.mockResolvedValue(null); // No existing snapshots

      // Act
      await service.generateHistoricalSnapshots(projectId, days);

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Generating historical snapshots for project ${projectId} for the past ${days} days`,
      );
      expect(mockSnapshotRepository.save).toHaveBeenCalledTimes(days);
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Historical snapshots generation completed for project ${projectId}`,
      );
    });

    it('should handle errors during historical snapshot generation', async () => {
      // Arrange
      const projectId = 'project-1';
      const days = 3;
      mockTasksService.findAll.mockRejectedValueOnce(
        new Error('Database error'),
      );

      // Act
      await service.generateHistoricalSnapshots(projectId, days);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate snapshot for'),
        expect.any(String),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Historical snapshots generation completed for project ${projectId}`,
      );
    });

    it('should update existing snapshots instead of creating new ones', async () => {
      // Arrange
      const projectId = 'project-1';
      const days = 1;
      const existingSnapshot = {
        id: 'snapshot-1',
        projectId: 'project-1',
        snapshotDate: new Date('2024-01-15'),
      };
      mockSnapshotRepository.findOne.mockResolvedValue(existingSnapshot);

      // Act
      await service.generateHistoricalSnapshots(projectId, days);

      // Assert
      expect(mockSnapshotRepository.update).toHaveBeenCalledWith(
        existingSnapshot.id,
        expect.objectContaining({
          totalTasks: 1,
          completedTasks: 0,
          inProgressTasks: 0,
          todoTasks: 1,
        }),
      );
      expect(mockSnapshotRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getProjectProgress', () => {
    it('should return current progress without trends or activity', async () => {
      // Arrange
      const projectId = 'project-1';

      // Act
      const result = await service.getProjectProgress(projectId);

      // Assert
      expect(result).toEqual({
        current: {
          totalTasks: 1,
          completedTasks: 0,
          inProgressTasks: 0,
          todoTasks: 1,
          completionPercentage: 0,
        },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Getting project progress for project ${projectId} with trends: false, activity: false, days: 30`,
      );
    });

    it('should return progress with trends included', async () => {
      // Arrange
      const projectId = 'project-1';
      const mockSnapshots = [
        {
          id: 'snapshot-1',
          projectId: 'project-1',
          snapshotDate: new Date('2024-01-15'),
          totalTasks: 5,
          completedTasks: 3,
          newTasksToday: 1,
          completionPercentage: 60,
          commentsAddedToday: 2,
        },
      ];
      mockSnapshotRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockSnapshots),
      });

      // Act
      const result = await service.getProjectProgress(
        projectId,
        true,
        false,
        7,
      );

      // Assert
      expect(result.trends).toBeDefined();
      expect(result.trends?.daily).toHaveLength(1);
      expect(result.trends?.daily[0]).toEqual({
        date: '2024-01-15',
        totalTasks: 5,
        completedTasks: 3,
        newTasks: 1,
        completionRate: 60,
        commentsAdded: 2,
      });
    });

    it('should return progress with activity included', async () => {
      // Arrange
      const projectId = 'project-1';
      const mockRawResult = {
        tasksCreated: '5',
        tasksCompleted: '3',
        commentsAdded: '10',
        attachmentsUploaded: '2',
      };
      mockSnapshotRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockRawResult),
      });

      // Act
      const result = await service.getProjectProgress(
        projectId,
        false,
        true,
        7,
      );

      // Assert
      expect(result.recentActivity).toBeDefined();
      expect(result.recentActivity).toEqual({
        tasksCreated: 5,
        tasksCompleted: 3,
        commentsAdded: 10,
        attachmentsUploaded: 2,
      });
    });

    it('should return progress with both trends and activity included', async () => {
      // Arrange
      const projectId = 'project-1';
      const mockSnapshots = [
        {
          id: 'snapshot-1',
          projectId: 'project-1',
          snapshotDate: new Date('2024-01-15'),
          totalTasks: 5,
          completedTasks: 3,
          newTasksToday: 1,
          completionPercentage: 60,
          commentsAddedToday: 2,
        },
      ];
      const mockRawResult = {
        tasksCreated: '5',
        tasksCompleted: '3',
        commentsAdded: '10',
        attachmentsUploaded: '2',
      };

      mockSnapshotRepository.createQueryBuilder
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockSnapshots),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue(mockRawResult),
        });

      // Act
      const result = await service.getProjectProgress(projectId, true, true, 7);

      // Assert
      expect(result.trends).toBeDefined();
      expect(result.recentActivity).toBeDefined();
    });

    it('should handle errors during progress retrieval', async () => {
      // Arrange
      const projectId = 'project-1';
      mockTasksService.findAll.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.getProjectProgress(projectId)).rejects.toThrow(
        'Database error',
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error getting project progress for project ${projectId}:`,
        expect.any(String),
      );
    });
  });

  describe('getHistoricalTrends', () => {
    it('should return historical trends for specified days', async () => {
      // Arrange
      const projectId = 'project-1';
      const days = 7;
      const mockSnapshots = [
        {
          id: 'snapshot-1',
          projectId: 'project-1',
          snapshotDate: new Date('2024-01-15'),
          totalTasks: 5,
          completedTasks: 3,
          newTasksToday: 1,
          completionPercentage: 60,
          commentsAddedToday: 2,
        },
        {
          id: 'snapshot-2',
          projectId: 'project-1',
          snapshotDate: new Date('2024-01-16'),
          totalTasks: 6,
          completedTasks: 4,
          newTasksToday: 1,
          completionPercentage: 66.67,
          commentsAddedToday: 3,
        },
      ];

      mockSnapshotRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockSnapshots),
      });

      // Act
      const result = await service.getHistoricalTrends(projectId, days);

      // Assert
      expect(result.daily).toHaveLength(2);
      expect(result.weekly).toBeDefined();
      expect(result.daily[0]).toEqual({
        date: '2024-01-15',
        totalTasks: 5,
        completedTasks: 3,
        newTasks: 1,
        completionRate: 60,
        commentsAdded: 2,
      });
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity for specified days', async () => {
      // Arrange
      const projectId = 'project-1';
      const days = 7;
      const mockRawResult = {
        tasksCreated: '10',
        tasksCompleted: '5',
        commentsAdded: '25',
        attachmentsUploaded: '8',
      };

      mockSnapshotRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockRawResult),
      });

      // Act
      const result = await service.getRecentActivity(projectId, days);

      // Assert
      expect(result).toEqual({
        tasksCreated: 10,
        tasksCompleted: 5,
        commentsAdded: 25,
        attachmentsUploaded: 8,
      });
    });

    it('should handle null results and return default values', async () => {
      // Arrange
      const projectId = 'project-1';
      const days = 7;

      mockSnapshotRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      });

      // Act
      const result = await service.getRecentActivity(projectId, days);

      // Assert
      expect(result).toEqual({
        tasksCreated: 0,
        tasksCompleted: 0,
        commentsAdded: 0,
        attachmentsUploaded: 0,
      });
    });
  });

  describe('groupSnapshotsByWeek', () => {
    it('should group snapshots by week correctly', () => {
      // Arrange
      const snapshots: TestSnapshot[] = [
        {
          ...mockSnapshot,
          id: 'snapshot-1',
          snapshotDate: new Date('2024-01-15'),
          totalTasks: 5,
          completedTasks: 3,
          newTasksToday: 1,
          completionPercentage: 60,
        },
        {
          ...mockSnapshot,
          id: 'snapshot-2',
          snapshotDate: new Date('2024-01-16'),
          totalTasks: 6,
          completedTasks: 4,
          newTasksToday: 1,
          completionPercentage: 66.67,
        },
        {
          ...mockSnapshot,
          id: 'snapshot-3',
          snapshotDate: new Date('2024-01-22'), // Different week
          totalTasks: 7,
          completedTasks: 5,
          newTasksToday: 1,
          completionPercentage: 71.43,
        },
      ];

      // Act
      const result = service.groupSnapshotsByWeek(
        snapshots as ProjectSnapshot[],
      );

      // Assert
      expect(result).toHaveLength(2); // Two different weeks
      expect(result[0]).toEqual({
        week: expect.any(String),
        totalTasks: 6, // Average of 5 and 6
        completedTasks: 4, // Average of 3 and 4
        newTasks: 2, // Sum of 1 and 1
        completionRate: expect.any(Number),
      });
    });

    it('should handle empty snapshots array', () => {
      // Arrange
      const snapshots: ProjectSnapshot[] = [];

      // Act
      const result = service.groupSnapshotsByWeek(snapshots);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
