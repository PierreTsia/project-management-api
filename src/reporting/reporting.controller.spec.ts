import { Test, TestingModule } from '@nestjs/testing';
import { ReportingController } from './reporting.controller';
import { ProjectSnapshotService } from './services/project-snapshot.service';
import { ProjectProgressDto } from '../projects/dto/project-progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { CustomLogger } from '../common/services/logger.service';
import { MockCustomLogger } from '../test/mocks';
import { User } from '../users/entities/user.entity';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';

describe('ReportingController', () => {
  let controller: ReportingController;
  let projectSnapshotService: ProjectSnapshotService;
  let mockLogger: MockCustomLogger;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    refreshTokens: [],
    password: 'hashedPassword',
    isEmailConfirmed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProjectProgress: ProjectProgressDto = {
    current: {
      totalTasks: 10,
      completedTasks: 6,
      inProgressTasks: 2,
      todoTasks: 2,
      completionPercentage: 60,
    },
    trends: {
      daily: [
        {
          date: '2024-01-15',
          totalTasks: 10,
          completedTasks: 6,
          newTasks: 1,
          completionRate: 60,
          commentsAdded: 3,
        },
      ],
      weekly: [
        {
          week: '2024-03',
          totalTasks: 10,
          completedTasks: 6,
          newTasks: 2,
          completionRate: 60,
        },
      ],
    },
    recentActivity: {
      tasksCreated: 2,
      tasksCompleted: 1,
      commentsAdded: 5,
      attachmentsUploaded: 3,
    },
  };

  const mockRequest: AuthenticatedRequest = {
    user: mockUser,
  } as AuthenticatedRequest;

  beforeEach(async () => {
    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [
        {
          provide: ProjectSnapshotService,
          useValue: {
            getProjectProgress: jest.fn(),
          },
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ProjectPermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReportingController>(ReportingController);
    projectSnapshotService = module.get<ProjectSnapshotService>(
      ProjectSnapshotService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProjectProgress', () => {
    it('should return project progress with default parameters', async () => {
      // Arrange
      const projectId = 'project-1';
      const include = undefined;
      const days = undefined;
      const acceptLanguage = 'en';

      jest
        .spyOn(projectSnapshotService, 'getProjectProgress')
        .mockResolvedValue(mockProjectProgress);

      // Act
      const result = await controller.getProjectProgress(
        mockRequest,
        projectId,
        include,
        days,
        acceptLanguage,
      );

      // Assert
      expect(result).toEqual(mockProjectProgress);
      expect(projectSnapshotService.getProjectProgress).toHaveBeenCalledWith(
        projectId,
        false, // includeTrends (forced to boolean)
        false, // includeActivity
        30, // daysNumber (default)
      );
    });

    it('should return project progress with trends included', async () => {
      // Arrange
      const projectId = 'project-1';
      const include = 'trends';
      const days = '60';
      const acceptLanguage = 'en';

      jest
        .spyOn(projectSnapshotService, 'getProjectProgress')
        .mockResolvedValue(mockProjectProgress);

      // Act
      const result = await controller.getProjectProgress(
        mockRequest,
        projectId,
        include,
        days,
        acceptLanguage,
      );

      // Assert
      expect(result).toEqual(mockProjectProgress);
      expect(projectSnapshotService.getProjectProgress).toHaveBeenCalledWith(
        projectId,
        true, // includeTrends
        false, // includeActivity
        60, // daysNumber
      );
    });

    it('should return project progress with activity included', async () => {
      // Arrange
      const projectId = 'project-1';
      const include = 'activity';
      const days = '7';
      const acceptLanguage = 'en';

      jest
        .spyOn(projectSnapshotService, 'getProjectProgress')
        .mockResolvedValue(mockProjectProgress);

      // Act
      const result = await controller.getProjectProgress(
        mockRequest,
        projectId,
        include,
        days,
        acceptLanguage,
      );

      // Assert
      expect(result).toEqual(mockProjectProgress);
      expect(projectSnapshotService.getProjectProgress).toHaveBeenCalledWith(
        projectId,
        false, // includeTrends
        true, // includeActivity
        7, // daysNumber
      );
    });

    it('should return project progress with both trends and activity included', async () => {
      // Arrange
      const projectId = 'project-1';
      const include = 'trends,activity';
      const days = '90';
      const acceptLanguage = 'en';

      jest
        .spyOn(projectSnapshotService, 'getProjectProgress')
        .mockResolvedValue(mockProjectProgress);

      // Act
      const result = await controller.getProjectProgress(
        mockRequest,
        projectId,
        include,
        days,
        acceptLanguage,
      );

      // Assert
      expect(result).toEqual(mockProjectProgress);
      expect(projectSnapshotService.getProjectProgress).toHaveBeenCalledWith(
        projectId,
        true, // includeTrends
        true, // includeActivity
        90, // daysNumber
      );
    });

    it('should handle invalid days parameter and use default', async () => {
      // Arrange
      const projectId = 'project-1';
      const include = undefined;
      const days = 'invalid';
      const acceptLanguage = 'en';

      jest
        .spyOn(projectSnapshotService, 'getProjectProgress')
        .mockResolvedValue(mockProjectProgress);

      // Act
      const result = await controller.getProjectProgress(
        mockRequest,
        projectId,
        include,
        days,
        acceptLanguage,
      );

      // Assert
      expect(result).toEqual(mockProjectProgress);
      expect(projectSnapshotService.getProjectProgress).toHaveBeenCalledWith(
        projectId,
        false, // includeTrends (forced to boolean)
        false, // includeActivity
        30, // daysNumber (default when invalid)
      );
    });

    it('should handle zero days parameter and use default', async () => {
      // Arrange
      const projectId = 'project-1';
      const include = undefined;
      const days = '0';
      const acceptLanguage = 'en';

      jest
        .spyOn(projectSnapshotService, 'getProjectProgress')
        .mockResolvedValue(mockProjectProgress);

      // Act
      const result = await controller.getProjectProgress(
        mockRequest,
        projectId,
        include,
        days,
        acceptLanguage,
      );

      // Assert
      expect(result).toEqual(mockProjectProgress);
      expect(projectSnapshotService.getProjectProgress).toHaveBeenCalledWith(
        projectId,
        false, // includeTrends (forced to boolean)
        false, // includeActivity
        30, // daysNumber (default when 0)
      );
    });

    it('should handle empty include parameter', async () => {
      // Arrange
      const projectId = 'project-1';
      const include = '';
      const days = '30';
      const acceptLanguage = 'en';

      jest
        .spyOn(projectSnapshotService, 'getProjectProgress')
        .mockResolvedValue(mockProjectProgress);

      // Act
      const result = await controller.getProjectProgress(
        mockRequest,
        projectId,
        include,
        days,
        acceptLanguage,
      );

      // Assert
      expect(result).toEqual(mockProjectProgress);
      expect(projectSnapshotService.getProjectProgress).toHaveBeenCalledWith(
        projectId,
        false, // includeTrends
        false, // includeActivity
        30, // daysNumber
      );
    });

    it('should handle case-sensitive include parameter (uppercase does not match)', async () => {
      // Arrange
      const projectId = 'project-1';
      const include = 'TRENDS,ACTIVITY';
      const days = '45';
      const acceptLanguage = 'en';

      jest
        .spyOn(projectSnapshotService, 'getProjectProgress')
        .mockResolvedValue(mockProjectProgress);

      // Act
      const result = await controller.getProjectProgress(
        mockRequest,
        projectId,
        include,
        days,
        acceptLanguage,
      );

      // Assert
      expect(result).toEqual(mockProjectProgress);
      expect(projectSnapshotService.getProjectProgress).toHaveBeenCalledWith(
        projectId,
        false, // includeTrends (case-sensitive, so 'TRENDS' doesn't match 'trends')
        false, // includeActivity (case-sensitive, so 'ACTIVITY' doesn't match 'activity')
        45, // daysNumber
      );
    });
  });
});
