import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectPermissionService } from './services/project-permission.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { ProjectStatus } from './entities/project.entity';
import { I18nService } from 'nestjs-i18n';
import { AddContributorDto } from './dto/add-contributor.dto';
import { UpdateContributorRoleDto } from './dto/update-contributor-role.dto';
import { ContributorResponseDto } from './dto/contributor-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { ProjectRole } from './enums/project-role.enum';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: ProjectsService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    isEmailConfirmed: true,
    avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=default',
    refreshTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test Description',
    status: ProjectStatus.ACTIVE,
    ownerId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: mockUser,
  };

  const mockContributor = {
    id: 'contributor-1',
    userId: 'user-2',
    role: ProjectRole.WRITE,
    joinedAt: new Date(),
    projectId: 'project-1',
    user: {
      id: 'user-2',
      email: 'contributor@example.com',
      name: 'Contributor User',
      bio: null,
      dob: null,
      phone: null,
      avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=default',
      isEmailConfirmed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            archive: jest.fn(),
            activate: jest.fn(),
            getContributors: jest.fn(),
            addContributor: jest.fn(),
            updateContributorRole: jest.fn(),
            removeContributor: jest.fn(),
            searchProjects: jest.fn(),
          },
        },
        {
          provide: ProjectPermissionService,
          useValue: {
            hasProjectPermission: jest.fn(),
            getUserProjectRole: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new project successfully', async () => {
      const createProjectDto: CreateProjectDto = {
        name: 'New Project',
        description: 'New Description',
      };

      (projectsService.create as jest.Mock).mockResolvedValue(mockProject);

      const result = await controller.create(
        { user: mockUser },
        createProjectDto,
      );

      expect(result).toBeInstanceOf(ProjectResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: mockProject.id,
          name: mockProject.name,
          description: mockProject.description,
          status: mockProject.status,
          ownerId: mockProject.ownerId,
        }),
      );
      expect(projectsService.create).toHaveBeenCalledWith(
        createProjectDto,
        mockUser.id,
      );
    });

    it('should handle accept-language header', async () => {
      const createProjectDto: CreateProjectDto = {
        name: 'New Project',
        description: 'New Description',
      };

      (projectsService.create as jest.Mock).mockResolvedValue(mockProject);

      const result = await controller.create(
        { user: mockUser },
        createProjectDto,
        'en-US',
      );

      expect(result).toBeInstanceOf(ProjectResponseDto);
      expect(projectsService.create).toHaveBeenCalledWith(
        createProjectDto,
        mockUser.id,
      );
    });
  });

  describe('findAll', () => {
    it('should return all projects for the current user', async () => {
      const projects = [mockProject];

      (projectsService.findAll as jest.Mock).mockResolvedValue(projects);

      const result = await controller.findAll({ user: mockUser });

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ProjectResponseDto);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: mockProject.id,
          name: mockProject.name,
          description: mockProject.description,
          status: mockProject.status,
          ownerId: mockProject.ownerId,
        }),
      );
      expect(projectsService.findAll).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('searchProjects', () => {
    it('should call the service and return paginated projects', async () => {
      const searchDto = { query: 'test', page: 1, limit: 10 };
      const serviceResult = {
        projects: [mockProject],
        total: 1,
        page: 1,
        limit: 10,
      };

      (projectsService.searchProjects as jest.Mock).mockResolvedValue(
        serviceResult,
      );

      const result = await controller.searchProjects(
        { user: mockUser },
        searchDto,
      );

      expect(projectsService.searchProjects).toHaveBeenCalledWith(
        mockUser.id,
        searchDto,
      );
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0]).toBeInstanceOf(ProjectResponseDto);
      expect(result.projects[0].id).toBe(mockProject.id);
    });
  });

  describe('findOne', () => {
    it('should return a specific project by ID', async () => {
      const projectId = 'project-1';

      (projectsService.findOne as jest.Mock).mockResolvedValue(mockProject);

      const result = await controller.findOne(
        { user: mockUser },
        projectId,
        'en-US',
      );

      expect(result).toBeInstanceOf(ProjectResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: mockProject.id,
          name: mockProject.name,
          description: mockProject.description,
          status: mockProject.status,
          ownerId: mockProject.ownerId,
        }),
      );
      expect(projectsService.findOne).toHaveBeenCalledWith(
        projectId,
        mockUser.id,
        'en-US',
      );
    });
  });

  describe('update', () => {
    it('should update a project successfully', async () => {
      const projectId = 'project-1';
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      };

      const updatedProject = { ...mockProject, ...updateProjectDto };

      (projectsService.update as jest.Mock).mockResolvedValue(updatedProject);

      const result = await controller.update(
        { user: mockUser },
        projectId,
        updateProjectDto,
        'en-US',
      );

      expect(result).toBeInstanceOf(ProjectResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: updatedProject.id,
          name: updatedProject.name,
          description: updatedProject.description,
          status: updatedProject.status,
          ownerId: updatedProject.ownerId,
        }),
      );
      expect(projectsService.update).toHaveBeenCalledWith(
        projectId,
        updateProjectDto,
        mockUser.id,
        'en-US',
      );
    });
  });

  describe('remove', () => {
    it('should remove a project successfully', async () => {
      const projectId = 'project-1';

      (projectsService.remove as jest.Mock).mockResolvedValue(undefined);

      await controller.remove({ user: mockUser }, projectId, 'en-US');

      expect(projectsService.remove).toHaveBeenCalledWith(
        projectId,
        mockUser.id,
        'en-US',
      );
    });
  });

  describe('archive', () => {
    it('should archive a project successfully', async () => {
      const projectId = 'project-1';
      const archivedProject = {
        ...mockProject,
        status: ProjectStatus.ARCHIVED,
      };

      (projectsService.archive as jest.Mock).mockResolvedValue(archivedProject);

      const result = await controller.archive(
        { user: mockUser },
        projectId,
        'en-US',
      );

      expect(result).toBeInstanceOf(ProjectResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: archivedProject.id,
          name: archivedProject.name,
          description: archivedProject.description,
          status: archivedProject.status,
          ownerId: archivedProject.ownerId,
        }),
      );
      expect(projectsService.archive).toHaveBeenCalledWith(
        projectId,
        mockUser.id,
        'en-US',
      );
    });
  });

  describe('activate', () => {
    it('should activate a project successfully', async () => {
      const projectId = 'project-1';
      const activatedProject = { ...mockProject, status: ProjectStatus.ACTIVE };

      (projectsService.activate as jest.Mock).mockResolvedValue(
        activatedProject,
      );

      const result = await controller.activate(
        { user: mockUser },
        projectId,
        'en-US',
      );

      expect(result).toBeInstanceOf(ProjectResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: activatedProject.id,
          name: activatedProject.name,
          description: activatedProject.description,
          status: activatedProject.status,
          ownerId: activatedProject.ownerId,
        }),
      );
      expect(projectsService.activate).toHaveBeenCalledWith(
        projectId,
        mockUser.id,
        'en-US',
      );
    });
  });

  describe('getContributors', () => {
    it('should return all contributors for a project', async () => {
      const projectId = 'project-1';
      const contributors = [mockContributor];

      (projectsService.getContributors as jest.Mock).mockResolvedValue(
        contributors,
      );

      const result = await controller.getContributors(
        { user: mockUser },
        projectId,
        'en-US',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ContributorResponseDto);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: mockContributor.id,
          userId: mockContributor.userId,
          role: mockContributor.role,
          joinedAt: mockContributor.joinedAt,
          user: expect.any(UserResponseDto),
        }),
      );
      expect(projectsService.getContributors).toHaveBeenCalledWith(
        projectId,
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-1';
      const contributors = [mockContributor];

      (projectsService.getContributors as jest.Mock).mockResolvedValue(
        contributors,
      );

      const result = await controller.getContributors(
        { user: mockUser },
        projectId,
        'fr-FR',
      );

      expect(result).toHaveLength(1);
      expect(projectsService.getContributors).toHaveBeenCalledWith(
        projectId,
        'fr-FR',
      );
    });
  });

  describe('addContributor', () => {
    it('should add a contributor to a project successfully', async () => {
      const projectId = 'project-1';
      const addContributorDto: AddContributorDto = {
        email: 'newcontributor@example.com',
        role: ProjectRole.READ,
      };

      (projectsService.addContributor as jest.Mock).mockResolvedValue(
        mockContributor,
      );

      const result = await controller.addContributor(
        { user: mockUser },
        projectId,
        addContributorDto,
        'en-US',
      );

      expect(result).toBeInstanceOf(ContributorResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: mockContributor.id,
          userId: mockContributor.userId,
          role: mockContributor.role,
          joinedAt: mockContributor.joinedAt,
          user: expect.any(UserResponseDto),
        }),
      );
      expect(projectsService.addContributor).toHaveBeenCalledWith(
        projectId,
        addContributorDto,
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-1';
      const addContributorDto: AddContributorDto = {
        email: 'newcontributor@example.com',
        role: ProjectRole.READ,
      };

      (projectsService.addContributor as jest.Mock).mockResolvedValue(
        mockContributor,
      );

      const result = await controller.addContributor(
        { user: mockUser },
        projectId,
        addContributorDto,
        'fr-FR',
      );

      expect(result).toBeInstanceOf(ContributorResponseDto);
      expect(projectsService.addContributor).toHaveBeenCalledWith(
        projectId,
        addContributorDto,
        'fr-FR',
      );
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

      (projectsService.updateContributorRole as jest.Mock).mockResolvedValue(
        updatedContributor,
      );

      const result = await controller.updateContributorRole(
        { user: mockUser },
        projectId,
        contributorId,
        updateRoleDto,
        'en-US',
      );

      expect(result).toBeInstanceOf(ContributorResponseDto);
      expect(result).toEqual(
        expect.objectContaining({
          id: updatedContributor.id,
          userId: updatedContributor.userId,
          role: updatedContributor.role,
          joinedAt: updatedContributor.joinedAt,
          user: expect.any(UserResponseDto),
        }),
      );
      expect(projectsService.updateContributorRole).toHaveBeenCalledWith(
        projectId,
        contributorId,
        updateRoleDto,
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-1';
      const contributorId = 'contributor-1';
      const updateRoleDto: UpdateContributorRoleDto = {
        role: ProjectRole.ADMIN,
      };

      (projectsService.updateContributorRole as jest.Mock).mockResolvedValue(
        mockContributor,
      );

      const result = await controller.updateContributorRole(
        { user: mockUser },
        projectId,
        contributorId,
        updateRoleDto,
        'fr-FR',
      );

      expect(result).toBeInstanceOf(ContributorResponseDto);
      expect(projectsService.updateContributorRole).toHaveBeenCalledWith(
        projectId,
        contributorId,
        updateRoleDto,
        'fr-FR',
      );
    });
  });

  describe('removeContributor', () => {
    it('should remove a contributor from a project successfully', async () => {
      const projectId = 'project-1';
      const contributorId = 'contributor-1';

      (projectsService.removeContributor as jest.Mock).mockResolvedValue(
        undefined,
      );

      await controller.removeContributor(
        { user: mockUser },
        projectId,
        contributorId,
        'en-US',
      );

      expect(projectsService.removeContributor).toHaveBeenCalledWith(
        projectId,
        contributorId,
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-1';
      const contributorId = 'contributor-1';

      (projectsService.removeContributor as jest.Mock).mockResolvedValue(
        undefined,
      );

      await controller.removeContributor(
        { user: mockUser },
        projectId,
        contributorId,
        'fr-FR',
      );

      expect(projectsService.removeContributor).toHaveBeenCalledWith(
        projectId,
        contributorId,
        'fr-FR',
      );
    });
  });
});
