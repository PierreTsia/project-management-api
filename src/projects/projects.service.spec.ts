import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from './projects.service';
import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectContributor } from './entities/project-contributor.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { I18nService } from 'nestjs-i18n';
import { NotFoundException } from '@nestjs/common';
import { CustomLogger } from '../common/services/logger.service';
import { MockCustomLogger } from '../test/mocks/logger.mock';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: Repository<Project>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockContributorRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
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
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectsRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
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
    it('should return all projects for a user', async () => {
      const ownerId = 'user-1';
      const projects = [mockProject];

      (projectsRepository.find as jest.Mock).mockResolvedValue(projects);

      const result = await service.findAll(ownerId);

      expect(result).toEqual(projects);
      expect(projectsRepository.find).toHaveBeenCalledWith({
        where: { ownerId },
        order: { createdAt: 'DESC' },
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Finding all projects for user ${ownerId}`,
      );
    });
  });

  describe('findOne', () => {
    it('should return a project by id and owner', async () => {
      const projectId = 'project-1';
      const ownerId = 'user-1';

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(mockProject);

      const result = await service.findOne(projectId, ownerId);

      expect(result).toEqual(mockProject);
      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId, ownerId },
        relations: ['owner'],
      });
    });

    it('should throw NotFoundException when project not found', async () => {
      const projectId = 'non-existent';
      const ownerId = 'user-1';

      (projectsRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(projectId, ownerId)).rejects.toThrow(
        NotFoundException,
      );

      expect(projectsRepository.findOne).toHaveBeenCalledWith({
        where: { id: projectId, ownerId },
        relations: ['owner'],
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Project not found with id: ${projectId} for user ${ownerId}`,
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

      (projectsRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(mockProject) // First call for validation
        .mockResolvedValueOnce(updatedProject); // Second call for return
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

      (projectsRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(mockProject) // First call for validation
        .mockResolvedValueOnce(archivedProject); // Second call for return
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

      (projectsRepository.findOne as jest.Mock)
        .mockResolvedValueOnce(mockProject) // First call for validation
        .mockResolvedValueOnce(activatedProject); // Second call for return
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
});
