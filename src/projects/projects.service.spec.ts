import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from './projects.service';
import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectContributor } from './entities/project-contributor.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { I18nService } from 'nestjs-i18n';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CustomLogger } from '../common/services/logger.service';
import { MockCustomLogger } from '../test/mocks/logger.mock';
import { UsersService } from '../users/users.service';
import { AddContributorDto } from './dto/add-contributor.dto';
import { UpdateContributorRoleDto } from './dto/update-contributor-role.dto';
import { ProjectRole } from './enums/project-role.enum';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: Repository<Project>;
  let contributorRepository: Repository<ProjectContributor>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockContributorRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockProject: Project = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test Description',
    status: ProjectStatus.ACTIVE,
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      isEmailConfirmed: true,
      avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=test',
      refreshTokens: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockUser = {
    id: 'user-2',
    email: 'contributor@example.com',
    name: 'Contributor User',
    isEmailConfirmed: true,
    avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=contributor',
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContributor: ProjectContributor = {
    id: 'contributor-1',
    projectId: 'project-1',
    userId: 'user-2',
    role: ProjectRole.WRITE,
    joinedAt: new Date(),
    user: mockUser,
    project: mockProject,
  };

  let mockLogger: MockCustomLogger;

  beforeEach(async () => {
    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ProjectContributor),
          useValue: mockContributorRepository,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectsRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    contributorRepository = module.get<Repository<ProjectContributor>>(
      getRepositoryToken(ProjectContributor),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new project successfully', async () => {
      const createProjectDto: CreateProjectDto = {
        name: 'New Project',
        description: 'New Description',
      };
      const ownerId = 'user-1';

      const createdProject = {
        ...createProjectDto,
        id: 'new-project-id',
        ownerId,
        status: ProjectStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (projectsRepository.create as jest.Mock).mockReturnValue(createdProject);
      (projectsRepository.save as jest.Mock).mockResolvedValue(createdProject);

      const result = await service.create(createProjectDto, ownerId);

      expect(result).toEqual(createdProject);
      expect(projectsRepository.create).toHaveBeenCalledWith({
        ...createProjectDto,
        ownerId,
        status: ProjectStatus.ACTIVE,
      });
      expect(projectsRepository.save).toHaveBeenCalledWith(createdProject);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Creating new project "${createProjectDto.name}" for user ${ownerId}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Project created successfully with id: new-project-id',
      );
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should return all projects for a user', async () => {
      const userId = 'user-1';
      const projects = [mockProject];

      // Mock the contributor query
      const mockContributorQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest
          .fn()
          .mockResolvedValue([
            { projectId: 'project-1' },
            { projectId: 'project-2' },
          ]),
      };

      // Mock the owned projects query
      const mockOwnedProjectsQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 'project-1' }, { id: 'project-3' }]),
      };

      (contributorRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockContributorQueryBuilder,
      );
      (projectsRepository.createQueryBuilder as jest.Mock).mockReturnValueOnce(
        mockOwnedProjectsQueryBuilder,
      );
      (projectsRepository.find as jest.Mock).mockResolvedValue(projects);

      const result = await service.findAll(userId);

      expect(result).toEqual(projects);
      expect(contributorRepository.createQueryBuilder).toHaveBeenCalledWith(
        'contributor',
      );
      expect(projectsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'project',
      );
      expect(projectsRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything() },
        order: { createdAt: 'DESC' },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Finding all projects for user ${userId}`,
      );
    });

    it('should return empty array when user has no accessible projects', async () => {
      const userId = 'user-1';

      // Mock empty contributor query
      const mockContributorQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };

      // Mock empty owned projects query
      const mockOwnedProjectsQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };

      (contributorRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockContributorQueryBuilder,
      );
      (projectsRepository.createQueryBuilder as jest.Mock).mockReturnValueOnce(
        mockOwnedProjectsQueryBuilder,
      );
      (projectsRepository.find as jest.Mock).mockClear();

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
      expect(contributorRepository.createQueryBuilder).toHaveBeenCalledWith(
        'contributor',
      );
      expect(projectsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'project',
      );
      expect(projectsRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a project by id when user is owner', async () => {
      const projectId = 'project-1';
      const userId = 'user-1';

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockProject),
      };

      (projectsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findOne(projectId, userId);

      expect(result).toEqual(mockProject);
      expect(projectsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'project',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.owner',
        'owner',
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'project_contributor',
        'contributor',
        'contributor.projectId = project.id AND contributor.userId = :userId',
        { userId },
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(project.ownerId = :userId OR contributor.userId = :userId)',
        { userId },
      );
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
    });

    it('should return a project by id when user is contributor', async () => {
      const projectId = 'project-1';
      const userId = 'user-1';

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockProject),
      };

      (projectsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findOne(projectId, userId);

      expect(result).toEqual(mockProject);
      expect(projectsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'project',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.owner',
        'owner',
      );
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'project_contributor',
        'contributor',
        'contributor.projectId = project.id AND contributor.userId = :userId',
        { userId },
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'project.id = :projectId',
        { projectId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(project.ownerId = :userId OR contributor.userId = :userId)',
        { userId },
      );
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException when project not found and user has no access', async () => {
      const projectId = 'non-existent';
      const userId = 'user-1';

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      (projectsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      await expect(service.findOne(projectId, userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(projectsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'project',
      );
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Project not found with id: ${projectId} for user ${userId}`,
      );
    });
  });

  describe('update', () => {
    it('should update a project successfully', async () => {
      const projectId = 'project-1';
      const ownerId = 'user-1';
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      };

      const updatedProject = { ...mockProject, ...updateProjectDto };

      // Mock validateProjectOwnership (which uses the old findOne approach)
      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);

      // Mock findOne (which uses the new createQueryBuilder approach)
      const mockFindOneQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(updatedProject),
      };

      (projectsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockFindOneQueryBuilder,
      );
      (projectsRepository.update as jest.Mock).mockResolvedValue({
        affected: 1,
      });

      const result = await service.update(projectId, updateProjectDto, ownerId);

      expect(result).toEqual(updatedProject);
      expect(projectsRepository.update).toHaveBeenCalledWith(
        projectId,
        updateProjectDto,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Updating project ${projectId} with data: ${JSON.stringify(updateProjectDto)}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Project ${projectId} updated successfully`,
      );
    });

    it('should throw NotFoundException when project not found during update', async () => {
      const projectId = 'non-existent';
      const ownerId = 'user-1';
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project',
      };

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(projectId, updateProjectDto, ownerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a project successfully', async () => {
      const projectId = 'project-1';
      const ownerId = 'user-1';

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);
      (projectsRepository.remove as jest.Mock).mockResolvedValue(mockProject);

      await service.remove(projectId, ownerId);

      expect(projectsRepository.remove).toHaveBeenCalledWith(mockProject);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Deleting project ${projectId} for user ${ownerId}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Project ${projectId} deleted successfully`,
      );
    });

    it('should throw NotFoundException when project not found during removal', async () => {
      const projectId = 'non-existent';
      const ownerId = 'user-1';

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(projectId, ownerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('archive', () => {
    it('should archive a project successfully', async () => {
      const projectId = 'project-1';
      const ownerId = 'user-1';

      const archivedProject = {
        ...mockProject,
        status: ProjectStatus.ARCHIVED,
      };

      // Mock validateProjectOwnership (which uses the old findOne approach)
      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);

      // Mock findOne (which uses the new createQueryBuilder approach)
      const mockFindOneQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(archivedProject),
      };

      (projectsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockFindOneQueryBuilder,
      );
      (projectsRepository.update as jest.Mock).mockResolvedValue({
        affected: 1,
      });

      const result = await service.archive(projectId, ownerId);

      expect(result).toEqual(archivedProject);
      expect(projectsRepository.update).toHaveBeenCalledWith(projectId, {
        status: ProjectStatus.ARCHIVED,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Archiving project ${projectId} for user ${ownerId}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Project ${projectId} archived successfully`,
      );
    });
  });

  describe('activate', () => {
    it('should activate a project successfully', async () => {
      const projectId = 'project-1';
      const ownerId = 'user-1';

      const activatedProject = { ...mockProject, status: ProjectStatus.ACTIVE };

      // Mock validateProjectOwnership (which uses the old findOne approach)
      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);

      // Mock findOne (which uses the new createQueryBuilder approach)
      const mockFindOneQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(activatedProject),
      };

      (projectsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockFindOneQueryBuilder,
      );
      (projectsRepository.update as jest.Mock).mockResolvedValue({
        affected: 1,
      });

      const result = await service.activate(projectId, ownerId);

      expect(result).toEqual(activatedProject);
      expect(projectsRepository.update).toHaveBeenCalledWith(projectId, {
        status: ProjectStatus.ACTIVE,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Activating project ${projectId} for user ${ownerId}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Project ${projectId} activated successfully`,
      );
    });
  });

  describe('getContributors', () => {
    it('should return all contributors for a project', async () => {
      const projectId = 'project-1';
      const contributors = [mockContributor];

      (contributorRepository.find as jest.Mock).mockResolvedValue(contributors);

      const result = await service.getContributors(projectId);

      expect(result).toEqual(contributors);
      expect(contributorRepository.find).toHaveBeenCalledWith({
        where: { projectId },
        relations: ['user'],
        order: { joinedAt: 'ASC' },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Getting contributors for project ${projectId}`,
      );
    });

    it('should return empty array when no contributors found', async () => {
      const projectId = 'project-1';

      (contributorRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await service.getContributors(projectId);

      expect(result).toEqual([]);
      expect(contributorRepository.find).toHaveBeenCalledWith({
        where: { projectId },
        relations: ['user'],
        order: { joinedAt: 'ASC' },
      });
    });
  });

  describe('addContributor', () => {
    it('should add a contributor to a project successfully', async () => {
      const projectId = 'project-1';
      const addContributorDto: AddContributorDto = {
        email: 'newcontributor@example.com',
        role: ProjectRole.READ,
      };

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);
      (mockUsersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (contributorRepository.findOne as jest.Mock).mockResolvedValue(null);
      (contributorRepository.create as jest.Mock).mockReturnValue(
        mockContributor,
      );
      (contributorRepository.save as jest.Mock).mockResolvedValue(
        mockContributor,
      );
      (contributorRepository.findOne as jest.Mock).mockImplementation(
        (args) => {
          if (
            args?.where?.id === mockContributor.id &&
            args?.relations?.includes('user')
          ) {
            return Promise.resolve(mockContributor);
          }
          return Promise.resolve(null);
        },
      );

      const result = await service.addContributor(
        projectId,
        addContributorDto,
        'en-US',
      );

      expect(result).toEqual(mockContributor);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        addContributorDto.email,
      );
      expect(contributorRepository.findOne).toHaveBeenCalledWith({
        where: { projectId, userId: mockUser.id },
      });
      expect(contributorRepository.create).toHaveBeenCalledWith({
        projectId,
        userId: mockUser.id,
        role: addContributorDto.role,
      });
      expect(contributorRepository.save).toHaveBeenCalledWith(mockContributor);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Adding contributor ${addContributorDto.email} to project ${projectId} with role ${addContributorDto.role}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Added contributor ${mockUser.id} with role ${addContributorDto.role} to project ${projectId}`,
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      const projectId = 'non-existent';
      const addContributorDto: AddContributorDto = {
        email: 'newcontributor@example.com',
        role: ProjectRole.READ,
      };

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockI18nService.translate as jest.Mock).mockReturnValue(
        'Project not found',
      );

      await expect(
        service.addContributor(projectId, addContributorDto, 'en-US'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user not found', async () => {
      const projectId = 'project-1';
      const addContributorDto: AddContributorDto = {
        email: 'nonexistent@example.com',
        role: ProjectRole.READ,
      };

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);
      (mockUsersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (mockI18nService.translate as jest.Mock).mockReturnValue(
        'User not found',
      );

      await expect(
        service.addContributor(projectId, addContributorDto, 'en-US'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is already a contributor', async () => {
      const projectId = 'project-1';
      const addContributorDto: AddContributorDto = {
        email: 'existingcontributor@example.com',
        role: ProjectRole.READ,
      };

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);
      (mockUsersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (contributorRepository.findOne as jest.Mock).mockResolvedValue(
        mockContributor,
      );
      (mockI18nService.translate as jest.Mock).mockReturnValue(
        'User already contributor',
      );

      await expect(
        service.addContributor(projectId, addContributorDto, 'en-US'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateContributorRole', () => {
    it('should update a contributor role successfully', async () => {
      const projectId = 'project-1';
      const contributorId = 'contributor-1';
      const updateRoleDto: UpdateContributorRoleDto = {
        role: ProjectRole.ADMIN,
      };

      const updatedContributor = {
        ...mockContributor,
        role: ProjectRole.ADMIN,
      };

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);
      (contributorRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(mockContributor) // First call for validation
        .mockResolvedValueOnce(updatedContributor); // Second call for return
      (contributorRepository.update as jest.Mock).mockResolvedValue({
        affected: 1,
      });

      const result = await service.updateContributorRole(
        projectId,
        contributorId,
        updateRoleDto,
        'en-US',
      );

      expect(result).toEqual(updatedContributor);
      expect(contributorRepository.update).toHaveBeenCalledWith(contributorId, {
        role: updateRoleDto.role,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Updating contributor ${contributorId} role to ${updateRoleDto.role} in project ${projectId}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Updated contributor ${contributorId} role to ${updateRoleDto.role} in project ${projectId}`,
      );
    });

    it('should throw NotFoundException when contributor not found', async () => {
      const projectId = 'project-1';
      const contributorId = 'non-existent';
      const updateRoleDto: UpdateContributorRoleDto = {
        role: ProjectRole.ADMIN,
      };

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);
      (contributorRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockI18nService.translate as jest.Mock).mockReturnValue(
        'Contributor not found',
      );

      await expect(
        service.updateContributorRole(
          projectId,
          contributorId,
          updateRoleDto,
          'en-US',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to change owner role', async () => {
      const projectId = 'project-1';
      const contributorId = 'contributor-1';
      const updateRoleDto: UpdateContributorRoleDto = {
        role: ProjectRole.READ,
      };

      const ownerContributor = { ...mockContributor, role: ProjectRole.OWNER };

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);
      (contributorRepository.findOne as jest.Mock).mockResolvedValue(
        ownerContributor,
      );
      (mockI18nService.translate as jest.Mock).mockReturnValue(
        'Cannot change owner role',
      );

      await expect(
        service.updateContributorRole(
          projectId,
          contributorId,
          updateRoleDto,
          'en-US',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeContributor', () => {
    it('should remove a contributor from a project successfully', async () => {
      const projectId = 'project-1';
      const contributorId = 'contributor-1';

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);
      (contributorRepository.findOne as jest.Mock).mockResolvedValue(
        mockContributor,
      );
      (contributorRepository.remove as jest.Mock).mockResolvedValue(
        mockContributor,
      );

      await service.removeContributor(projectId, contributorId, 'en-US');

      expect(contributorRepository.remove).toHaveBeenCalledWith(
        mockContributor,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Removing contributor ${contributorId} from project ${projectId}`,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Removed contributor ${contributorId} from project ${projectId}`,
      );
    });

    it('should throw NotFoundException when contributor not found', async () => {
      const projectId = 'project-1';
      const contributorId = 'non-existent';

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);
      (contributorRepository.findOne as jest.Mock).mockResolvedValue(null);
      (mockI18nService.translate as jest.Mock).mockReturnValue(
        'Contributor not found',
      );

      await expect(
        service.removeContributor(projectId, contributorId, 'en-US'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to remove owner', async () => {
      const projectId = 'project-1';
      const contributorId = 'contributor-1';

      const ownerContributor = { ...mockContributor, role: ProjectRole.OWNER };

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);
      (contributorRepository.findOne as jest.Mock).mockResolvedValue(
        ownerContributor,
      );
      (mockI18nService.translate as jest.Mock).mockReturnValue(
        'Cannot remove owner',
      );

      await expect(
        service.removeContributor(projectId, contributorId, 'en-US'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to remove last admin', async () => {
      const projectId = 'project-1';
      const contributorId = 'contributor-1';

      const adminContributor = { ...mockContributor, role: ProjectRole.ADMIN };

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);
      (contributorRepository.findOne as jest.Mock).mockResolvedValue(
        adminContributor,
      );
      (contributorRepository.count as jest.Mock).mockResolvedValue(1); // Only one admin
      (mockI18nService.translate as jest.Mock).mockReturnValue(
        'Cannot remove last admin',
      );

      await expect(
        service.removeContributor(projectId, contributorId, 'en-US'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('searchProjects', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should search projects successfully with filters', async () => {
      const userId = 'user-1';
      const searchDto = {
        query: 'test',
        status: ProjectStatus.ACTIVE,
        page: 1,
        limit: 20,
      };
      const projects = [mockProject];

      // Mock the contributor query
      const mockContributorQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest
          .fn()
          .mockResolvedValue([
            { projectId: 'project-1' },
            { projectId: 'project-2' },
          ]),
      };

      // Mock the owned projects query
      const mockOwnedProjectsQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 'project-1' }, { id: 'project-3' }]),
      };

      // Mock the search query
      const mockSearchQueryBuilder = {
        ...mockQueryBuilder,
        getManyAndCount: jest.fn().mockResolvedValue([projects, 1]),
      };

      (contributorRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockContributorQueryBuilder,
      );
      (projectsRepository.createQueryBuilder as jest.Mock)
        .mockReturnValueOnce(mockOwnedProjectsQueryBuilder)
        .mockReturnValueOnce(mockSearchQueryBuilder);

      const result = await service.searchProjects(userId, searchDto);

      expect(result).toEqual({
        projects,
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(contributorRepository.createQueryBuilder).toHaveBeenCalledWith(
        'contributor',
      );
      expect(projectsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'project',
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Searching projects for user ${userId} with filters: ${JSON.stringify(searchDto)}`,
      );
    });

    it('should return empty results when user has no accessible projects', async () => {
      const userId = 'user-1';
      const searchDto = {
        query: 'test',
        page: 1,
        limit: 20,
      };

      // Mock empty contributor query
      const mockContributorQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };

      // Mock empty owned projects query
      const mockOwnedProjectsQueryBuilder = {
        ...mockQueryBuilder,
        getMany: jest.fn().mockResolvedValue([]),
      };

      (contributorRepository.createQueryBuilder as jest.Mock).mockReturnValue(
        mockContributorQueryBuilder,
      );
      (projectsRepository.createQueryBuilder as jest.Mock).mockReturnValueOnce(
        mockOwnedProjectsQueryBuilder,
      );
      // Do NOT mock the final search query builder, service should short-circuit

      const result = await service.searchProjects(userId, searchDto);

      expect(result).toEqual({
        projects: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    });
  });
});
