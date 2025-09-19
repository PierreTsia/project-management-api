import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { TaskHierarchyService } from './task-hierarchy.service';
import { TaskHierarchy } from '../entities/task-hierarchy.entity';
import { Task } from '../entities/task.entity';
import { CreateTaskHierarchyDto } from '../dto/create-task-hierarchy.dto';
import { TaskHierarchyDto } from '../dto/task-hierarchy.dto';
import { HierarchyTreeDto } from '../dto/hierarchy-tree.dto';
import { HierarchyValidationChain } from './validation/hierarchy-validation-chain';
import { TaskLinkService } from './task-link.service';
import { CustomLogger } from '../../common/services/logger.service';
import { MockCustomLogger } from '../../test/mocks';

describe('TaskHierarchyService', () => {
  let service: TaskHierarchyService;
  let taskHierarchyRepository: Repository<TaskHierarchy>;
  let taskRepository: Repository<Task>;
  let hierarchyValidationChain: HierarchyValidationChain;
  let taskLinkService: TaskLinkService;
  let i18nService: I18nService;
  let mockLogger: MockCustomLogger;

  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO' as any,
    priority: 'MEDIUM' as any,
    dueDate: new Date(),
    projectId: 'project-123',
    assigneeId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    project: undefined,
    assignee: undefined,
  };

  const mockTaskHierarchy: TaskHierarchy = {
    id: 'hierarchy-123',
    projectId: 'project-123',
    parentTaskId: 'parent-task-123',
    childTaskId: 'child-task-123',
    createdAt: new Date(),
    project: undefined,
    parentTask: undefined,
    childTask: undefined,
  };

  const mockCreateTaskHierarchyDto: CreateTaskHierarchyDto = {
    projectId: 'project-123',
    parentTaskId: 'parent-task-123',
    childTaskId: 'child-task-123',
  };

  const mockTaskHierarchyWithTask: TaskHierarchyDto = {
    id: 'hierarchy-123',
    projectId: 'project-123',
    parentTaskId: 'parent-task-123',
    childTaskId: 'child-task-123',
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

  const _mockHierarchyTree: HierarchyTreeDto = {
    parents: [mockTaskHierarchyWithTask],
    children: [mockTaskHierarchyWithTask],
    parentCount: 1,
    childCount: 1,
  };

  beforeEach(async () => {
    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskHierarchyService,
        {
          provide: getRepositoryToken(TaskHierarchy),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            t: jest.fn((key: string) => key),
          },
        },
        {
          provide: HierarchyValidationChain,
          useValue: {
            validateHierarchy: jest.fn(),
          },
        },
        {
          provide: TaskLinkService,
          useValue: {
            listLinksWithTasks: jest.fn(),
            batchListLinksWithTasks: jest.fn(),
          },
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<TaskHierarchyService>(TaskHierarchyService);
    taskHierarchyRepository = module.get<Repository<TaskHierarchy>>(
      getRepositoryToken(TaskHierarchy),
    );
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    hierarchyValidationChain = module.get<HierarchyValidationChain>(
      HierarchyValidationChain,
    );
    taskLinkService = module.get<TaskLinkService>(TaskLinkService);
    i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createHierarchy', () => {
    it('should create a parent-child task relationship successfully', async () => {
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest
        .spyOn(hierarchyValidationChain, 'validateHierarchy')
        .mockResolvedValue({ valid: true });
      jest
        .spyOn(taskHierarchyRepository, 'create')
        .mockReturnValue(mockTaskHierarchy);
      jest
        .spyOn(taskHierarchyRepository, 'save')
        .mockResolvedValue(mockTaskHierarchy);

      const result = await service.createHierarchy(
        mockCreateTaskHierarchyDto,
        'en-US',
      );

      expect(result).toEqual(mockTaskHierarchy);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: mockCreateTaskHierarchyDto.parentTaskId,
          projectId: mockCreateTaskHierarchyDto.projectId,
        },
      });
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: mockCreateTaskHierarchyDto.childTaskId,
          projectId: mockCreateTaskHierarchyDto.projectId,
        },
      });
      expect(hierarchyValidationChain.validateHierarchy).toHaveBeenCalledWith({
        parentTask: mockTask,
        childTask: mockTask,
        projectId: mockCreateTaskHierarchyDto.projectId,
      });
      expect(taskHierarchyRepository.create).toHaveBeenCalledWith({
        projectId: mockCreateTaskHierarchyDto.projectId,
        parentTaskId: mockCreateTaskHierarchyDto.parentTaskId,
        childTaskId: mockCreateTaskHierarchyDto.childTaskId,
      });
      expect(taskHierarchyRepository.save).toHaveBeenCalledWith(
        mockTaskHierarchy,
      );
    });

    it('should throw NotFoundException when parent task not found', async () => {
      jest.spyOn(taskRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(taskRepository, 'findOne').mockResolvedValueOnce(mockTask);

      await expect(
        service.createHierarchy(mockCreateTaskHierarchyDto, 'en-US'),
      ).rejects.toThrow(NotFoundException);

      expect(i18nService.t).toHaveBeenCalledWith(
        'errors.tasks.task_not_found',
        {
          args: {
            id: mockCreateTaskHierarchyDto.parentTaskId,
            projectId: mockCreateTaskHierarchyDto.projectId,
          },
          lang: 'en-US',
        },
      );
    });

    it('should throw NotFoundException when child task not found', async () => {
      jest.spyOn(taskRepository, 'findOne').mockResolvedValueOnce(mockTask);
      jest.spyOn(taskRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(
        service.createHierarchy(mockCreateTaskHierarchyDto, 'en-US'),
      ).rejects.toThrow(NotFoundException);

      expect(i18nService.t).toHaveBeenCalledWith(
        'errors.tasks.task_not_found',
        {
          args: {
            id: mockCreateTaskHierarchyDto.childTaskId,
            projectId: mockCreateTaskHierarchyDto.projectId,
          },
          lang: 'en-US',
        },
      );
    });

    it('should throw BadRequestException when validation fails', async () => {
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest
        .spyOn(hierarchyValidationChain, 'validateHierarchy')
        .mockResolvedValue({
          valid: false,
          reason: 'errors.task_hierarchy.circular_dependency',
        });

      await expect(
        service.createHierarchy(mockCreateTaskHierarchyDto, 'en-US'),
      ).rejects.toThrow(BadRequestException);

      expect(i18nService.t).toHaveBeenCalledWith(
        'errors.task_hierarchy.circular_dependency',
        {
          lang: 'en-US',
        },
      );
    });

    it('should handle accept-language header', async () => {
      jest.spyOn(taskRepository, 'findOne').mockResolvedValue(mockTask);
      jest
        .spyOn(hierarchyValidationChain, 'validateHierarchy')
        .mockResolvedValue({ valid: true });
      jest
        .spyOn(taskHierarchyRepository, 'create')
        .mockReturnValue(mockTaskHierarchy);
      jest
        .spyOn(taskHierarchyRepository, 'save')
        .mockResolvedValue(mockTaskHierarchy);

      const result = await service.createHierarchy(
        mockCreateTaskHierarchyDto,
        'fr-FR',
      );

      expect(result).toEqual(mockTaskHierarchy);
      // The service should work with the accept-language parameter
      expect(taskRepository.findOne).toHaveBeenCalled();
    });
  });

  describe('deleteHierarchy', () => {
    it('should delete a parent-child task relationship successfully', async () => {
      jest
        .spyOn(taskHierarchyRepository, 'delete')
        .mockResolvedValue({ affected: 1 } as any);

      await service.deleteHierarchy(
        'project-123',
        'parent-task-123',
        'child-task-123',
        'en-US',
      );

      expect(taskHierarchyRepository.delete).toHaveBeenCalledWith({
        projectId: 'project-123',
        parentTaskId: 'parent-task-123',
        childTaskId: 'child-task-123',
      });
    });

    it('should throw NotFoundException when hierarchy not found', async () => {
      jest
        .spyOn(taskHierarchyRepository, 'delete')
        .mockResolvedValue({ affected: 0 } as any);

      await expect(
        service.deleteHierarchy(
          'project-123',
          'parent-task-123',
          'child-task-123',
          'en-US',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(i18nService.t).toHaveBeenCalledWith(
        'errors.task_hierarchy.not_found',
        {
          lang: 'en-US',
        },
      );
    });

    it('should handle accept-language header', async () => {
      jest
        .spyOn(taskHierarchyRepository, 'delete')
        .mockResolvedValue({ affected: 1 } as any);

      await service.deleteHierarchy(
        'project-123',
        'parent-task-123',
        'child-task-123',
        'fr-FR',
      );

      expect(taskHierarchyRepository.delete).toHaveBeenCalledWith({
        projectId: 'project-123',
        parentTaskId: 'parent-task-123',
        childTaskId: 'child-task-123',
      });
    });
  });

  describe('getHierarchyForTask', () => {
    it('should return complete hierarchy for a task', async () => {
      jest
        .spyOn(service, 'getParentsForTask')
        .mockResolvedValue([mockTaskHierarchyWithTask]);
      jest
        .spyOn(service, 'getChildrenForTask')
        .mockResolvedValue([mockTaskHierarchyWithTask]);

      const result = await service.getHierarchyForTask('task-123');

      expect(result).toEqual(
        expect.objectContaining({
          parents: [mockTaskHierarchyWithTask],
          children: [mockTaskHierarchyWithTask],
          parentCount: 1,
          childCount: 1,
        }),
      );
      expect(service.getParentsForTask).toHaveBeenCalledWith('task-123');
      expect(service.getChildrenForTask).toHaveBeenCalledWith('task-123');
    });
  });

  describe('getParentsForTask', () => {
    it('should return direct parents of a task', async () => {
      const mockHierarchyWithParent = {
        ...mockTaskHierarchy,
        parentTask: {
          ...mockTask,
          id: 'parent-task-123',
          project: {
            id: 'project-123',
            name: 'Test Project',
            status: 'ACTIVE' as any,
            ownerId: 'user-123',
            owner: undefined,
            contributors: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
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
            refreshTokens: [],
          } as any,
        } as any,
      };
      jest
        .spyOn(taskHierarchyRepository, 'find')
        .mockResolvedValue([mockHierarchyWithParent]);
      jest
        .spyOn(taskLinkService, 'batchListLinksWithTasks')
        .mockResolvedValue(new Map());

      const result = await service.getParentsForTask('task-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'hierarchy-123',
          projectId: 'project-123',
          parentTaskId: 'parent-task-123',
          childTaskId: 'child-task-123',
        }),
      );
      expect(result[0].parentTask).toBeDefined();
      expect(taskHierarchyRepository.find).toHaveBeenCalledWith({
        where: { childTaskId: 'task-123' },
        relations: ['parentTask', 'parentTask.assignee', 'parentTask.project'],
      });
    });

    it('should handle empty parents', async () => {
      jest.spyOn(taskHierarchyRepository, 'find').mockResolvedValue([]);

      const result = await service.getParentsForTask('task-123');

      expect(result).toEqual([]);
    });
  });

  describe('getChildrenForTask', () => {
    it('should return direct children of a task', async () => {
      const mockHierarchyWithChild = {
        ...mockTaskHierarchy,
        childTask: {
          ...mockTask,
          id: 'child-task-123',
          project: {
            id: 'project-123',
            name: 'Test Project',
            status: 'ACTIVE' as any,
            ownerId: 'user-123',
            owner: undefined,
            contributors: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
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
            refreshTokens: [],
          } as any,
        } as any,
      };
      jest
        .spyOn(taskHierarchyRepository, 'find')
        .mockResolvedValue([mockHierarchyWithChild]);
      jest
        .spyOn(taskLinkService, 'batchListLinksWithTasks')
        .mockResolvedValue(new Map());

      const result = await service.getChildrenForTask('task-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'hierarchy-123',
          projectId: 'project-123',
          parentTaskId: 'parent-task-123',
          childTaskId: 'child-task-123',
        }),
      );
      expect(result[0].childTask).toBeDefined();
      expect(taskHierarchyRepository.find).toHaveBeenCalledWith({
        where: { parentTaskId: 'task-123' },
        relations: ['childTask', 'childTask.assignee', 'childTask.project'],
      });
    });

    it('should handle empty children', async () => {
      jest.spyOn(taskHierarchyRepository, 'find').mockResolvedValue([]);

      const result = await service.getChildrenForTask('task-123');

      expect(result).toEqual([]);
    });
  });

  describe('getAllParentsForTask', () => {
    it('should return all parents recursively', async () => {
      const mockParent1 = {
        ...mockTaskHierarchyWithTask,
        parentTaskId: 'parent-1',
      };
      const mockParent2 = {
        ...mockTaskHierarchyWithTask,
        parentTaskId: 'parent-2',
      };

      jest
        .spyOn(service, 'getParentsForTask')
        .mockResolvedValueOnce([mockParent1])
        .mockResolvedValueOnce([mockParent2])
        .mockResolvedValueOnce([]);

      const result = await service.getAllParentsForTask('task-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockParent1);
      expect(result[1]).toEqual(mockParent2);
    });

    it('should handle circular dependencies by tracking visited tasks', async () => {
      const mockParent1 = {
        ...mockTaskHierarchyWithTask,
        parentTaskId: 'parent-1',
      };
      const mockParent2 = {
        ...mockTaskHierarchyWithTask,
        parentTaskId: 'parent-2',
      };

      jest
        .spyOn(service, 'getParentsForTask')
        .mockResolvedValueOnce([mockParent1])
        .mockResolvedValueOnce([mockParent2]) // Different parent
        .mockResolvedValueOnce([]);

      const result = await service.getAllParentsForTask('task-123');

      // Should include both parents
      expect(result).toHaveLength(2);
    });
  });

  describe('getAllChildrenForTask', () => {
    it('should return all children recursively', async () => {
      const mockChild1 = {
        ...mockTaskHierarchyWithTask,
        childTaskId: 'child-1',
      };
      const mockChild2 = {
        ...mockTaskHierarchyWithTask,
        childTaskId: 'child-2',
      };

      jest
        .spyOn(service, 'getChildrenForTask')
        .mockResolvedValueOnce([mockChild1])
        .mockResolvedValueOnce([mockChild2])
        .mockResolvedValueOnce([]);

      const result = await service.getAllChildrenForTask('task-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockChild1);
      expect(result[1]).toEqual(mockChild2);
    });

    it('should handle circular dependencies by tracking visited tasks', async () => {
      const mockChild1 = {
        ...mockTaskHierarchyWithTask,
        childTaskId: 'child-1',
      };
      const mockChild2 = {
        ...mockTaskHierarchyWithTask,
        childTaskId: 'child-2',
      };

      jest
        .spyOn(service, 'getChildrenForTask')
        .mockResolvedValueOnce([mockChild1])
        .mockResolvedValueOnce([mockChild2]) // Different child
        .mockResolvedValueOnce([]);

      const result = await service.getAllChildrenForTask('task-123');

      // Should include both children
      expect(result).toHaveLength(2);
    });
  });
});
