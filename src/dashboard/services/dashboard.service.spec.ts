import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { Task } from '../../tasks/entities/task.entity';
import { Project } from '../../projects/entities/project.entity';
import { ProjectContributor } from '../../projects/entities/project-contributor.entity';
import { ProjectsService } from '../../projects/projects.service';
import { I18nService } from 'nestjs-i18n';
import { CustomLogger } from '../../common/services/logger.service';
import { MockCustomLogger } from '../../test/mocks/logger.mock';
import { TaskStatus } from '../../tasks/enums/task-status.enum';
import { TaskPriority } from '../../tasks/enums/task-priority.enum';
import { ProjectStatus } from '../../projects/entities/project.entity';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockProjectsService = {
    findAll: jest.fn(),
  };

  const mockI18nService = {
    t: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ProjectContributor),
          useValue: mockRepository,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: CustomLogger,
          useClass: MockCustomLogger,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardSummary', () => {
    it('should return empty summary when user has no projects', async () => {
      // Arrange
      const userId = 'user-1';
      mockProjectsService.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getDashboardSummary(userId);

      // Assert
      expect(result).toEqual({
        totalProjects: 0,
        activeProjects: 0,
        archivedProjects: 0,
        totalTasks: 0,
        assignedTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        tasksByStatus: {
          todo: 0,
          inProgress: 0,
          done: 0,
        },
        tasksByPriority: {
          low: 0,
          medium: 0,
          high: 0,
        },
        completionRate: 0,
        averageTasksPerProject: 0,
        recentActivity: [],
      });
    });

    it('should return summary with project and task statistics', async () => {
      // Arrange
      const userId = 'user-1';
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project Alpha',
          status: ProjectStatus.ACTIVE,
          owner: { id: userId, name: 'John Doe' },
        },
        {
          id: 'project-2',
          name: 'Project Beta',
          status: ProjectStatus.ARCHIVED,
          owner: { id: userId, name: 'John Doe' },
        },
      ];

      mockProjectsService.findAll.mockResolvedValue(mockProjects);
      mockQueryBuilder.getCount.mockResolvedValue(10);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { status: TaskStatus.TODO, count: '5' },
        { status: TaskStatus.IN_PROGRESS, count: '3' },
        { status: TaskStatus.DONE, count: '2' },
        { priority: TaskPriority.HIGH, count: '4' },
        { priority: TaskPriority.MEDIUM, count: '4' },
        { priority: TaskPriority.LOW, count: '2' },
      ]);

      // Act
      const result = await service.getDashboardSummary(userId);

      // Assert
      expect(result.totalProjects).toBe(2);
      expect(result.activeProjects).toBe(1);
      expect(result.archivedProjects).toBe(1);
      expect(result.totalTasks).toBe(10);
      expect(result.tasksByStatus.todo).toBe(5);
      expect(result.tasksByStatus.inProgress).toBe(3);
      expect(result.tasksByStatus.done).toBe(2);
    });
  });

  describe('getUserTasks', () => {
    it('should return empty array when user has no projects', async () => {
      // Arrange
      const userId = 'user-1';
      const query = { page: 1, limit: 20 };
      mockProjectsService.findAll.mockResolvedValue([]);

      // Act
      const result = await service.getUserTasks(userId, query);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return user tasks with proper filtering', async () => {
      // Arrange
      const userId = 'user-1';
      const query = { status: TaskStatus.TODO, page: 1, limit: 20 };
      const mockProjects = [{ id: 'project-1', name: 'Project Alpha' }];
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task',
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          project: { id: 'project-1', name: 'Project Alpha' },
          assignee: { id: userId, name: 'John Doe' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProjectsService.findAll.mockResolvedValue(mockProjects);
      mockQueryBuilder.getMany.mockResolvedValue(mockTasks);

      // Act
      const result = await service.getUserTasks(userId, query);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-1');
      expect(result[0].status).toBe(TaskStatus.TODO);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'task.status = :status',
        { status: TaskStatus.TODO },
      );
    });
  });

  describe('getUserProjects', () => {
    it('should return user projects with task counts', async () => {
      // Arrange
      const userId = 'user-1';
      const mockProjects = [
        {
          id: 'project-1',
          name: 'Project Alpha',
          status: ProjectStatus.ACTIVE,
          owner: { id: userId, name: 'John Doe' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProjectsService.findAll.mockResolvedValue(mockProjects);

      // Mock projects with owner relation (first call)
      mockRepository.find
        .mockResolvedValueOnce([
          {
            id: 'project-1',
            name: 'Project Alpha',
            status: ProjectStatus.ACTIVE,
            owner: { id: userId, name: 'John Doe' },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ])
        // Mock contributors find (second call)
        .mockResolvedValueOnce([
          {
            projectId: 'project-1',
            userId: userId,
            role: 'ADMIN',
          },
        ]);

      // Mock task counts query builder
      mockQueryBuilder.getRawMany.mockResolvedValue([
        {
          projectId: 'project-1',
          totalCount: '5',
          assignedCount: '3',
        },
      ]);

      // Act
      const result = await service.getUserProjects(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('project-1');
      expect(result[0].userRole).toBe('ADMIN');
      expect(result[0].taskCount).toBe(5);
      expect(result[0].assignedTaskCount).toBe(3);
    });
  });
});
