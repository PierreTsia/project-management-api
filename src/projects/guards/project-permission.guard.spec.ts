import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ProjectPermissionGuard } from './project-permission.guard';
import { ProjectPermissionService } from '../services/project-permission.service';
import { ProjectRole } from '../enums/project-role.enum';
import { REQUIRE_PROJECT_ROLE_KEY } from '../decorators/require-project-role.decorator';

describe('ProjectPermissionGuard', () => {
  let guard: ProjectPermissionGuard;
  let projectPermissionService: ProjectPermissionService;
  let reflector: Reflector;
  let i18nService: I18nService;

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'user-1' },
        params: { id: 'project-1' },
      }),
    }),
    getHandler: () => ({}),
  } as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectPermissionGuard,
        {
          provide: ProjectPermissionService,
          useValue: {
            hasProjectPermission: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
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

    guard = module.get<ProjectPermissionGuard>(ProjectPermissionGuard);
    projectPermissionService = module.get<ProjectPermissionService>(
      ProjectPermissionService,
    );
    reflector = module.get<Reflector>(Reflector);
    i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true when no role requirement is set', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(undefined);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(reflector.get).toHaveBeenCalledWith(
        REQUIRE_PROJECT_ROLE_KEY,
        mockExecutionContext.getHandler(),
      );
    });

    it('should throw ForbiddenException when user is missing', async () => {
      const mockContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => ({
            user: null,
            params: { id: 'project-1' },
          }),
        }),
      } as ExecutionContext;

      jest.spyOn(reflector, 'get').mockReturnValue(ProjectRole.READ);
      jest
        .spyOn(i18nService, 'translate')
        .mockReturnValue('User or project not found');

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.project.user_or_project_not_found',
      );
    });

    it('should throw ForbiddenException when project ID is missing', async () => {
      const mockContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-1' },
            params: {},
          }),
        }),
      } as ExecutionContext;

      jest.spyOn(reflector, 'get').mockReturnValue(ProjectRole.READ);
      jest
        .spyOn(i18nService, 'translate')
        .mockReturnValue('User or project not found');

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.project.user_or_project_not_found',
      );
    });

    it('should return true when user has sufficient permission', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(ProjectRole.READ);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(true);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(
        projectPermissionService.hasProjectPermission,
      ).toHaveBeenCalledWith('user-1', 'project-1', ProjectRole.READ);
    });

    it('should throw ForbiddenException when user has insufficient permission', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(ProjectRole.ADMIN);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(false);
      jest
        .spyOn(i18nService, 'translate')
        .mockReturnValue('You do not have ADMIN permission for this project');

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        ForbiddenException,
      );

      expect(i18nService.translate).toHaveBeenCalledWith(
        'errors.project.insufficient_permission',
        { args: { role: ProjectRole.ADMIN } },
      );
    });
  });
});
