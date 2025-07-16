import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from '../entities/comment.entity';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { ProjectPermissionService } from '../../projects/services/project-permission.service';
import { TasksService } from '../tasks.service';
import { CustomLogger } from '../../common/services/logger.service';
import { MockCustomLogger } from '../../test/mocks';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentsRepository: Repository<Comment>;
  let tasksService: TasksService;
  let projectPermissionService: ProjectPermissionService;
  let mockLogger: MockCustomLogger;

  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    projectId: 'project-1',
    status: 'TODO',
    priority: 'MEDIUM',
    assigneeId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockComment = {
    id: 'comment-1',
    content: 'Test comment',
    taskId: 'task-1',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    task: {
      id: 'task-1',
      project: {
        id: 'project-1',
      },
    },
    user: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
    },
  };

  const mockCreateCommentDto: CreateCommentDto = {
    content: 'Test comment content',
  };

  const mockUpdateCommentDto: UpdateCommentDto = {
    content: 'Updated comment content',
  };

  beforeEach(async () => {
    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoin: jest.fn().mockReturnThis(),
              innerJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              getOne: jest.fn(),
              getCount: jest.fn(),
            })),
          },
        },
        {
          provide: TasksService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: ProjectPermissionService,
          useValue: {
            hasProjectPermission: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn((key: string) => key),
          },
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    commentsRepository = module.get<Repository<Comment>>(
      getRepositoryToken(Comment),
    );
    tasksService = module.get<TasksService>(TasksService);
    projectPermissionService = module.get<ProjectPermissionService>(
      ProjectPermissionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      jest.spyOn(tasksService, 'findById').mockResolvedValue(mockTask as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(true);
      jest
        .spyOn(commentsRepository, 'create')
        .mockReturnValue(mockComment as any);
      jest
        .spyOn(commentsRepository, 'save')
        .mockResolvedValue(mockComment as any);

      const result = await service.createComment(
        'task-1',
        'user-1',
        mockCreateCommentDto,
      );

      expect(result).toBeInstanceOf(Object);
      expect(tasksService.findById).toHaveBeenCalledWith('task-1', undefined);
      expect(commentsRepository.create).toHaveBeenCalledWith({
        content: mockCreateCommentDto.content,
        taskId: 'task-1',
        userId: 'user-1',
      });
      expect(commentsRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when task not found', async () => {
      jest
        .spyOn(tasksService, 'findById')
        .mockRejectedValue(new NotFoundException('Task not found'));

      await expect(
        service.createComment('task-1', 'user-1', mockCreateCommentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      jest.spyOn(tasksService, 'findById').mockResolvedValue(mockTask as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(false);

      await expect(
        service.createComment('task-1', 'user-1', mockCreateCommentDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTaskComments', () => {
    it('should return comments for a task', async () => {
      jest.spyOn(tasksService, 'findById').mockResolvedValue(mockTask as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(true);
      jest
        .spyOn(commentsRepository, 'find')
        .mockResolvedValue([mockComment] as any);

      const result = await service.getTaskComments('task-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(tasksService.findById).toHaveBeenCalledWith('task-1', undefined);
      expect(commentsRepository.find).toHaveBeenCalledWith({
        where: { taskId: 'task-1' },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should throw NotFoundException when task not found', async () => {
      jest
        .spyOn(tasksService, 'findById')
        .mockRejectedValue(new NotFoundException('Task not found'));

      await expect(service.getTaskComments('task-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      jest.spyOn(tasksService, 'findById').mockResolvedValue(mockTask as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(false);

      await expect(service.getTaskComments('task-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateComment', () => {
    it('should update comment when user is author', async () => {
      const mockCommentWithTask = {
        ...mockComment,
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(mockCommentWithTask as any);
      jest
        .spyOn(commentsRepository, 'save')
        .mockResolvedValue(mockCommentWithTask as any);

      const result = await service.updateComment(
        'comment-1',
        'user-1',
        mockUpdateCommentDto,
      );

      expect(result).toBeInstanceOf(Object);
      expect(commentsRepository.save).toHaveBeenCalled();
    });

    it('should update comment when user has admin permission', async () => {
      const mockCommentWithTask = {
        ...mockComment,
        userId: 'other-user',
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(mockCommentWithTask as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(true);
      jest
        .spyOn(commentsRepository, 'save')
        .mockResolvedValue(mockCommentWithTask as any);

      const result = await service.updateComment(
        'comment-1',
        'user-1',
        mockUpdateCommentDto,
      );

      expect(result).toBeInstanceOf(Object);
      expect(commentsRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when comment not found', async () => {
      jest.spyOn(commentsRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.updateComment('comment-1', 'user-1', mockUpdateCommentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not author and lacks admin permission', async () => {
      const mockCommentWithTask = {
        ...mockComment,
        userId: 'other-user',
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(mockCommentWithTask as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(false);

      await expect(
        service.updateComment('comment-1', 'user-1', mockUpdateCommentDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteComment', () => {
    it('should delete comment when user is author', async () => {
      const mockCommentWithTask = {
        ...mockComment,
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(mockCommentWithTask as any);
      jest
        .spyOn(commentsRepository, 'remove')
        .mockResolvedValue(mockCommentWithTask as any);

      await service.deleteComment('comment-1', 'user-1');

      expect(commentsRepository.remove).toHaveBeenCalledWith(
        mockCommentWithTask,
      );
    });

    it('should delete comment when user has admin permission', async () => {
      const mockCommentWithTask = {
        ...mockComment,
        userId: 'other-user',
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(mockCommentWithTask as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(true);
      jest
        .spyOn(commentsRepository, 'remove')
        .mockResolvedValue(mockCommentWithTask as any);

      await service.deleteComment('comment-1', 'user-1');

      expect(commentsRepository.remove).toHaveBeenCalledWith(
        mockCommentWithTask,
      );
    });

    it('should throw NotFoundException when comment not found', async () => {
      jest.spyOn(commentsRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.deleteComment('comment-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not author and lacks admin permission', async () => {
      const mockCommentWithTask = {
        ...mockComment,
        userId: 'other-user',
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(mockCommentWithTask as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(false);

      await expect(
        service.deleteComment('comment-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getCommentsCountForProjectAndDateRange', () => {
    it('should return correct count of comments for project in date range', async () => {
      const projectId = 'project-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const expectedCount = 5;

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(expectedCount),
      };

      jest
        .spyOn(commentsRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getCommentsCountForProjectAndDateRange(
        projectId,
        startDate,
        endDate,
      );

      expect(result).toBe(expectedCount);
      expect(commentsRepository.createQueryBuilder).toHaveBeenCalledWith(
        'comment',
      );
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'comment.task',
        'task',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'task.projectId = :projectId',
        { projectId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'comment.createdAt >= :startDate',
        { startDate },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'comment.createdAt <= :endDate',
        { endDate },
      );
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
    });

    it('should return 0 when no comments found', async () => {
      const projectId = 'project-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      jest
        .spyOn(commentsRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getCommentsCountForProjectAndDateRange(
        projectId,
        startDate,
        endDate,
      );

      expect(result).toBe(0);
    });

    it('should handle database errors gracefully and return 0', async () => {
      const projectId = 'project-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest
          .fn()
          .mockRejectedValue(new Error('Database connection failed')),
      };

      jest
        .spyOn(commentsRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getCommentsCountForProjectAndDateRange(
        projectId,
        startDate,
        endDate,
      );

      expect(result).toBe(0);
    });
  });
});
