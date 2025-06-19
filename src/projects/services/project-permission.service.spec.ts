import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectPermissionService } from './project-permission.service';
import { ProjectContributor } from '../entities/project-contributor.entity';
import { ProjectRole } from '../enums/project-role.enum';

describe('ProjectPermissionService', () => {
  let service: ProjectPermissionService;
  let repository: Repository<ProjectContributor>;

  const mockRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectPermissionService,
        {
          provide: getRepositoryToken(ProjectContributor),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectPermissionService>(ProjectPermissionService);
    repository = module.get<Repository<ProjectContributor>>(
      getRepositoryToken(ProjectContributor),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProjectRole', () => {
    it('should return user role when contributor exists', async () => {
      const mockContributor = {
        userId: 'user-1',
        projectId: 'project-1',
        role: ProjectRole.ADMIN,
      };

      mockRepository.findOne.mockResolvedValue(mockContributor);

      const result = await service.getUserProjectRole('user-1', 'project-1');

      expect(result).toBe(ProjectRole.ADMIN);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          projectId: 'project-1',
        },
      });
    });

    it('should return null when contributor does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserProjectRole('user-1', 'project-1');

      expect(result).toBeNull();
    });
  });

  describe('hasProjectPermission', () => {
    it('should return false when user has no role', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.hasProjectPermission(
        'user-1',
        'project-1',
        ProjectRole.READ,
      );

      expect(result).toBe(false);
    });

    it('should return true when user has OWNER role for any required role', async () => {
      const mockContributor = {
        userId: 'user-1',
        projectId: 'project-1',
        role: ProjectRole.OWNER,
      };

      mockRepository.findOne.mockResolvedValue(mockContributor);

      const result = await service.hasProjectPermission(
        'user-1',
        'project-1',
        ProjectRole.ADMIN,
      );

      expect(result).toBe(true);
    });

    it('should return true when user has ADMIN role for WRITE permission', async () => {
      const mockContributor = {
        userId: 'user-1',
        projectId: 'project-1',
        role: ProjectRole.ADMIN,
      };

      mockRepository.findOne.mockResolvedValue(mockContributor);

      const result = await service.hasProjectPermission(
        'user-1',
        'project-1',
        ProjectRole.WRITE,
      );

      expect(result).toBe(true);
    });

    it('should return false when user has READ role for ADMIN permission', async () => {
      const mockContributor = {
        userId: 'user-1',
        projectId: 'project-1',
        role: ProjectRole.READ,
      };

      mockRepository.findOne.mockResolvedValue(mockContributor);

      const result = await service.hasProjectPermission(
        'user-1',
        'project-1',
        ProjectRole.ADMIN,
      );

      expect(result).toBe(false);
    });

    it('should return true when user has exact required role', async () => {
      const mockContributor = {
        userId: 'user-1',
        projectId: 'project-1',
        role: ProjectRole.WRITE,
      };

      mockRepository.findOne.mockResolvedValue(mockContributor);

      const result = await service.hasProjectPermission(
        'user-1',
        'project-1',
        ProjectRole.WRITE,
      );

      expect(result).toBe(true);
    });
  });
});
