import { Test, TestingModule } from '@nestjs/testing';
import { TaskHierarchyController } from './task-hierarchy.controller';
import { TaskHierarchyService } from '../services/task-hierarchy.service';
import { TaskHierarchyDto } from '../dto/task-hierarchy.dto';
import { HierarchyTreeDto } from '../dto/hierarchy-tree.dto';
import { ProjectPermissionGuard } from '../../projects/guards/project-permission.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ProjectRole } from '../../projects/enums/project-role.enum';
import { REQUIRE_PROJECT_ROLE_KEY } from '../../projects/decorators/require-project-role.decorator';

describe('TaskHierarchyController', () => {
  let controller: TaskHierarchyController;
  let taskHierarchyService: TaskHierarchyService;

  const mockTaskHierarchy: TaskHierarchyDto = {
    id: 'hierarchy-123',
    projectId: 'project-123',
    parentTaskId: 'parent-task-123',
    childTaskId: 'child-task-123',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
  };

  const mockTaskHierarchyWithTask: TaskHierarchyDto = {
    ...mockTaskHierarchy,
    parentTask: {
      id: 'parent-task-123',
      title: 'Parent Task',
      description: 'Parent task description',
      status: 'TODO' as any,
      priority: 'HIGH' as any,
      projectId: 'project-123',
      projectName: 'Test Project',
      assignee: {
        id: 'user-123',
        name: 'User 123',
        email: 'user123@example.com',
        bio: 'User 123 bio',
        dob: new Date(),
        phone: '1234567890',
        avatarUrl: 'https://example.com/avatar.jpg',
        isEmailConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'local' as any,
        canChangePassword: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    childTask: {
      id: 'child-task-123',
      title: 'Child Task',
      description: 'Child task description',
      status: 'TODO' as any,
      priority: 'MEDIUM' as any,
      projectId: 'project-123',
      projectName: 'Test Project',
      assignee: {
        id: 'user-456',
        name: 'User 456',
        email: 'user456@example.com',
        bio: 'User 456 bio',
        dob: new Date(),
        phone: '1234567890',
        avatarUrl: 'https://example.com/avatar.jpg',
        isEmailConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: 'local' as any,
        canChangePassword: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockHierarchyTree: HierarchyTreeDto = {
    parents: [mockTaskHierarchyWithTask],
    children: [mockTaskHierarchyWithTask],
    parentCount: 1,
    childCount: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskHierarchyController],
      providers: [
        {
          provide: TaskHierarchyService,
          useValue: {
            createHierarchy: jest.fn(),
            deleteHierarchy: jest.fn(),
            getHierarchyForTask: jest.fn(),
            getChildrenForTask: jest.fn(),
            getParentsForTask: jest.fn(),
            getAllChildrenForTask: jest.fn(),
            getAllParentsForTask: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ProjectPermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TaskHierarchyController>(TaskHierarchyController);
    taskHierarchyService =
      module.get<TaskHierarchyService>(TaskHierarchyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createHierarchy', () => {
    it('should create a parent-child task relationship successfully', async () => {
      const projectId = 'project-123';
      const parentTaskId = 'parent-task-123';
      const childTaskId = 'child-task-123';

      (taskHierarchyService.createHierarchy as jest.Mock).mockResolvedValue(
        mockTaskHierarchy,
      );

      const result = await controller.createHierarchy(
        projectId,
        parentTaskId,
        childTaskId,
        'en-US',
      );

      expect(result).toBeInstanceOf(TaskHierarchyDto);
      expect(result).toEqual(mockTaskHierarchy);
      expect(taskHierarchyService.createHierarchy).toHaveBeenCalledWith(
        {
          projectId,
          parentTaskId,
          childTaskId,
        },
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-123';
      const parentTaskId = 'parent-task-123';
      const childTaskId = 'child-task-123';

      (taskHierarchyService.createHierarchy as jest.Mock).mockResolvedValue(
        mockTaskHierarchy,
      );

      const result = await controller.createHierarchy(
        projectId,
        parentTaskId,
        childTaskId,
        'fr-FR',
      );

      expect(result).toBeInstanceOf(TaskHierarchyDto);
      expect(taskHierarchyService.createHierarchy).toHaveBeenCalledWith(
        {
          projectId,
          parentTaskId,
          childTaskId,
        },
        'fr-FR',
      );
    });
  });

  describe('deleteHierarchy', () => {
    it('should delete a parent-child task relationship successfully', async () => {
      const projectId = 'project-123';
      const parentTaskId = 'parent-task-123';
      const childTaskId = 'child-task-123';

      (taskHierarchyService.deleteHierarchy as jest.Mock).mockResolvedValue(
        undefined,
      );

      await controller.deleteHierarchy(
        projectId,
        parentTaskId,
        childTaskId,
        'en-US',
      );

      expect(taskHierarchyService.deleteHierarchy).toHaveBeenCalledWith(
        projectId,
        parentTaskId,
        childTaskId,
        'en-US',
      );
    });

    it('should handle accept-language header', async () => {
      const projectId = 'project-123';
      const parentTaskId = 'parent-task-123';
      const childTaskId = 'child-task-123';

      (taskHierarchyService.deleteHierarchy as jest.Mock).mockResolvedValue(
        undefined,
      );

      await controller.deleteHierarchy(
        projectId,
        parentTaskId,
        childTaskId,
        'fr-FR',
      );

      expect(taskHierarchyService.deleteHierarchy).toHaveBeenCalledWith(
        projectId,
        parentTaskId,
        childTaskId,
        'fr-FR',
      );
    });
  });

  describe('getHierarchy', () => {
    it('should return complete hierarchy for a task', async () => {
      const taskId = 'task-123';

      (taskHierarchyService.getHierarchyForTask as jest.Mock).mockResolvedValue(
        mockHierarchyTree,
      );

      const result = await controller.getHierarchy(taskId);

      expect(result).toEqual(
        expect.objectContaining({
          parents: expect.any(Array),
          children: expect.any(Array),
          parentCount: expect.any(Number),
          childCount: expect.any(Number),
        }),
      );
      expect(result).toEqual(mockHierarchyTree);
      expect(result.parentCount).toBe(1);
      expect(result.childCount).toBe(1);
      expect(taskHierarchyService.getHierarchyForTask).toHaveBeenCalledWith(
        taskId,
      );
    });

    it('should handle empty hierarchy', async () => {
      const taskId = 'task-123';
      const emptyHierarchy: HierarchyTreeDto = {
        parents: [],
        children: [],
        parentCount: 0,
        childCount: 0,
      };

      (taskHierarchyService.getHierarchyForTask as jest.Mock).mockResolvedValue(
        emptyHierarchy,
      );

      const result = await controller.getHierarchy(taskId);

      expect(result).toEqual(emptyHierarchy);
      expect(result.parentCount).toBe(0);
      expect(result.childCount).toBe(0);
    });
  });

  describe('getChildren', () => {
    it('should return direct children of a task', async () => {
      const taskId = 'task-123';
      const children = [mockTaskHierarchyWithTask];

      (taskHierarchyService.getChildrenForTask as jest.Mock).mockResolvedValue(
        children,
      );

      const result = await controller.getChildren(taskId);

      expect(result).toEqual(children);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'hierarchy-123',
          projectId: 'project-123',
          parentTaskId: 'parent-task-123',
          childTaskId: 'child-task-123',
        }),
      );
      expect(taskHierarchyService.getChildrenForTask).toHaveBeenCalledWith(
        taskId,
      );
    });

    it('should handle empty children', async () => {
      const taskId = 'task-123';

      (taskHierarchyService.getChildrenForTask as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await controller.getChildren(taskId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getParents', () => {
    it('should return direct parents of a task', async () => {
      const taskId = 'task-123';
      const parents = [mockTaskHierarchyWithTask];

      (taskHierarchyService.getParentsForTask as jest.Mock).mockResolvedValue(
        parents,
      );

      const result = await controller.getParents(taskId);

      expect(result).toEqual(parents);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'hierarchy-123',
          projectId: 'project-123',
          parentTaskId: 'parent-task-123',
          childTaskId: 'child-task-123',
        }),
      );
      expect(taskHierarchyService.getParentsForTask).toHaveBeenCalledWith(
        taskId,
      );
    });

    it('should handle empty parents', async () => {
      const taskId = 'task-123';

      (taskHierarchyService.getParentsForTask as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await controller.getParents(taskId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getAllChildren', () => {
    it('should return all children recursively', async () => {
      const taskId = 'task-123';
      const allChildren = [
        mockTaskHierarchyWithTask,
        mockTaskHierarchyWithTask,
      ];

      (
        taskHierarchyService.getAllChildrenForTask as jest.Mock
      ).mockResolvedValue(allChildren);

      const result = await controller.getAllChildren(taskId);

      expect(result).toEqual(allChildren);
      expect(result).toHaveLength(2);
      expect(taskHierarchyService.getAllChildrenForTask).toHaveBeenCalledWith(
        taskId,
      );
    });

    it('should handle empty recursive children', async () => {
      const taskId = 'task-123';

      (
        taskHierarchyService.getAllChildrenForTask as jest.Mock
      ).mockResolvedValue([]);

      const result = await controller.getAllChildren(taskId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getAllParents', () => {
    it('should return all parents recursively', async () => {
      const taskId = 'task-123';
      const allParents = [mockTaskHierarchyWithTask, mockTaskHierarchyWithTask];

      (
        taskHierarchyService.getAllParentsForTask as jest.Mock
      ).mockResolvedValue(allParents);

      const result = await controller.getAllParents(taskId);

      expect(result).toEqual(allParents);
      expect(result).toHaveLength(2);
      expect(taskHierarchyService.getAllParentsForTask).toHaveBeenCalledWith(
        taskId,
      );
    });

    it('should handle empty recursive parents', async () => {
      const taskId = 'task-123';

      (
        taskHierarchyService.getAllParentsForTask as jest.Mock
      ).mockResolvedValue([]);

      const result = await controller.getAllParents(taskId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('Guards and Decorators', () => {
    let reflector: Reflector;

    beforeAll(() => {
      reflector = new Reflector();
    });

    it('should have JwtAuthGuard and ProjectPermissionGuard applied', () => {
      const guards = reflector.getAllAndMerge<any[]>('__guards__', [
        controller.createHierarchy,
        TaskHierarchyController,
      ]);
      expect(guards).toHaveLength(2);
      expect(guards.some((g) => g === JwtAuthGuard)).toBe(true);
      expect(guards.some((g) => g === ProjectPermissionGuard)).toBe(true);
    });

    it('should require WRITE role for createHierarchy', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.createHierarchy,
      );
      expect(role).toBe(ProjectRole.WRITE);
    });

    it('should require WRITE role for deleteHierarchy', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.deleteHierarchy,
      );
      expect(role).toBe(ProjectRole.WRITE);
    });

    it('should require READ role for getHierarchy', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.getHierarchy,
      );
      expect(role).toBe(ProjectRole.READ);
    });

    it('should require READ role for getChildren', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.getChildren,
      );
      expect(role).toBe(ProjectRole.READ);
    });

    it('should require READ role for getParents', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.getParents,
      );
      expect(role).toBe(ProjectRole.READ);
    });

    it('should require READ role for getAllChildren', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.getAllChildren,
      );
      expect(role).toBe(ProjectRole.READ);
    });

    it('should require READ role for getAllParents', () => {
      const role = reflector.get<ProjectRole>(
        REQUIRE_PROJECT_ROLE_KEY,
        controller.getAllParents,
      );
      expect(role).toBe(ProjectRole.READ);
    });
  });
});
