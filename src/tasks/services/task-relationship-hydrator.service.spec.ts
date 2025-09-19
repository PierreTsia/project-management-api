import { Test, TestingModule } from '@nestjs/testing';
import { TaskRelationshipHydrator } from './task-relationship-hydrator.service';
import { TaskLinkService } from './task-link.service';
import { TaskHierarchyService } from './task-hierarchy.service';
import { TaskLinkWithTaskDto } from '../dto/task-link-with-task.dto';
import { HierarchyTreeDto } from '../dto/hierarchy-tree.dto';

describe('TaskRelationshipHydrator', () => {
  let service: TaskRelationshipHydrator;
  let taskLinkService: TaskLinkService;
  let taskHierarchyService: TaskHierarchyService;

  const mockTaskLinkWithTask: TaskLinkWithTaskDto = {
    id: 'link-123',
    projectId: 'project-123',
    sourceTaskId: 'task-123',
    targetTaskId: 'task-456',
    type: 'BLOCKS' as any,
    createdAt: new Date(),
    sourceTask: {
      id: 'task-123',
      title: 'Source Task',
      description: 'Source task description',
      status: 'TODO' as any,
      priority: 'MEDIUM' as any,
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
    targetTask: {
      id: 'task-456',
      title: 'Target Task',
      description: 'Target task description',
      status: 'TODO' as any,
      priority: 'HIGH' as any,
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
    parents: [
      {
        id: 'hierarchy-123',
        projectId: 'project-123',
        parentTaskId: 'parent-task-123',
        childTaskId: 'task-123',
        createdAt: new Date(),
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
      },
    ],
    children: [
      {
        id: 'hierarchy-456',
        projectId: 'project-123',
        parentTaskId: 'task-123',
        childTaskId: 'child-task-123',
        createdAt: new Date(),
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
      },
    ],
    parentCount: 1,
    childCount: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskRelationshipHydrator,
        {
          provide: TaskLinkService,
          useValue: {
            listLinksWithTasks: jest.fn(),
          },
        },
        {
          provide: TaskHierarchyService,
          useValue: {
            getHierarchyForTask: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaskRelationshipHydrator>(TaskRelationshipHydrator);
    taskLinkService = module.get<TaskLinkService>(TaskLinkService);
    taskHierarchyService =
      module.get<TaskHierarchyService>(TaskHierarchyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hydrateTaskRelationships', () => {
    it('should hydrate task relationships successfully', async () => {
      jest
        .spyOn(taskLinkService, 'listLinksWithTasks')
        .mockResolvedValue([mockTaskLinkWithTask]);
      jest
        .spyOn(taskHierarchyService, 'getHierarchyForTask')
        .mockResolvedValue(mockHierarchyTree);

      const result = await service.hydrateTaskRelationships('task-123');

      expect(result).toEqual({
        links: [mockTaskLinkWithTask],
        hierarchy: mockHierarchyTree,
      });
      expect(taskLinkService.listLinksWithTasks).toHaveBeenCalledWith(
        'task-123',
      );
      expect(taskHierarchyService.getHierarchyForTask).toHaveBeenCalledWith(
        'task-123',
      );
    });

    it('should handle empty relationships', async () => {
      jest.spyOn(taskLinkService, 'listLinksWithTasks').mockResolvedValue([]);
      jest
        .spyOn(taskHierarchyService, 'getHierarchyForTask')
        .mockResolvedValue({
          parents: [],
          children: [],
          parentCount: 0,
          childCount: 0,
        });

      const result = await service.hydrateTaskRelationships('task-123');

      expect(result).toEqual({
        links: [],
        hierarchy: {
          parents: [],
          children: [],
          parentCount: 0,
          childCount: 0,
        },
      });
    });

    it('should call both services in parallel for optimal performance', async () => {
      const linkSpy = jest
        .spyOn(taskLinkService, 'listLinksWithTasks')
        .mockResolvedValue([mockTaskLinkWithTask]);
      const hierarchySpy = jest
        .spyOn(taskHierarchyService, 'getHierarchyForTask')
        .mockResolvedValue(mockHierarchyTree);

      await service.hydrateTaskRelationships('task-123');

      // Both services should be called
      expect(linkSpy).toHaveBeenCalledWith('task-123');
      expect(hierarchySpy).toHaveBeenCalledWith('task-123');
    });
  });

  describe('hydrateMultipleTaskRelationships', () => {
    it('should hydrate relationships for multiple tasks', async () => {
      const taskIds = ['task-1', 'task-2', 'task-3'];
      const mockLinks1 = [mockTaskLinkWithTask];
      const mockLinks2 = [{ ...mockTaskLinkWithTask, id: 'link-456' }];
      const mockLinks3 = [];

      const mockHierarchy1 = {
        ...mockHierarchyTree,
        parentCount: 1,
        childCount: 1,
      };
      const mockHierarchy2 = {
        ...mockHierarchyTree,
        parentCount: 2,
        childCount: 0,
      };
      const mockHierarchy3 = {
        ...mockHierarchyTree,
        parentCount: 0,
        childCount: 3,
      };

      jest
        .spyOn(taskLinkService, 'listLinksWithTasks')
        .mockResolvedValueOnce(mockLinks1)
        .mockResolvedValueOnce(mockLinks2)
        .mockResolvedValueOnce(mockLinks3);

      jest
        .spyOn(taskHierarchyService, 'getHierarchyForTask')
        .mockResolvedValueOnce(mockHierarchy1)
        .mockResolvedValueOnce(mockHierarchy2)
        .mockResolvedValueOnce(mockHierarchy3);

      const result = await service.hydrateMultipleTaskRelationships(taskIds);

      expect(result.size).toBe(3);
      expect(result.get('task-1')).toEqual({
        links: mockLinks1,
        hierarchy: mockHierarchy1,
      });
      expect(result.get('task-2')).toEqual({
        links: mockLinks2,
        hierarchy: mockHierarchy2,
      });
      expect(result.get('task-3')).toEqual({
        links: mockLinks3,
        hierarchy: mockHierarchy3,
      });
    });

    it('should handle empty task IDs array', async () => {
      const result = await service.hydrateMultipleTaskRelationships([]);

      expect(result.size).toBe(0);
    });

    it('should process all tasks in parallel for optimal performance', async () => {
      const taskIds = ['task-1', 'task-2'];
      const startTime = Date.now();

      jest
        .spyOn(taskLinkService, 'listLinksWithTasks')
        .mockImplementation(async (taskId) => {
          // Simulate async delay
          await new Promise((resolve) => setTimeout(resolve, 100));
          return taskId === 'task-1' ? [mockTaskLinkWithTask] : [];
        });

      jest
        .spyOn(taskHierarchyService, 'getHierarchyForTask')
        .mockImplementation(async (taskId) => {
          // Simulate async delay
          await new Promise((resolve) => setTimeout(resolve, 100));
          return taskId === 'task-1'
            ? mockHierarchyTree
            : { parents: [], children: [], parentCount: 0, childCount: 0 };
        });

      const result = await service.hydrateMultipleTaskRelationships(taskIds);
      const endTime = Date.now();

      // Should complete in approximately 100ms (parallel) rather than 200ms (sequential)
      expect(endTime - startTime).toBeLessThan(150);
      expect(result.size).toBe(2);
    });

    it('should handle service errors gracefully', async () => {
      const taskIds = ['task-1', 'task-2'];

      jest
        .spyOn(taskLinkService, 'listLinksWithTasks')
        .mockResolvedValueOnce([mockTaskLinkWithTask])
        .mockRejectedValueOnce(new Error('Service error'));

      jest
        .spyOn(taskHierarchyService, 'getHierarchyForTask')
        .mockResolvedValueOnce(mockHierarchyTree)
        .mockResolvedValueOnce({
          parents: [],
          children: [],
          parentCount: 0,
          childCount: 0,
        });

      await expect(
        service.hydrateMultipleTaskRelationships(taskIds),
      ).rejects.toThrow('Service error');
    });
  });
});
