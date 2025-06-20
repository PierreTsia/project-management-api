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
import { ProjectRole } from '../../projects/enums/project-role.enum';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentsRepository: Repository<Comment>;
  let projectPermissionService: ProjectPermissionService;

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
              where: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              getOne: jest.fn(),
            })),
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
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    commentsRepository = module.get<Repository<Comment>>(
      getRepositoryToken(Comment),
    );
    projectPermissionService = module.get<ProjectPermissionService>(
      ProjectPermissionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const taskQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          task: { project: { id: 'project-1' } },
        }),
      };

      jest
        .spyOn(commentsRepository, 'createQueryBuilder')
        .mockReturnValue(taskQueryBuilder as any);
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
      expect(commentsRepository.create).toHaveBeenCalledWith({
        content: mockCreateCommentDto.content,
        taskId: 'task-1',
        userId: 'user-1',
      });
      expect(commentsRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(commentsRepository, 'createQueryBuilder')
        .mockReturnValue(taskQueryBuilder as any);

      await expect(
        service.createComment('task-1', 'user-1', mockCreateCommentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      const taskQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          task: { project: { id: 'project-1' } },
        }),
      };

      jest
        .spyOn(commentsRepository, 'createQueryBuilder')
        .mockReturnValue(taskQueryBuilder as any);
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
      const taskQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          task: { project: { id: 'project-1' } },
        }),
      };

      jest
        .spyOn(commentsRepository, 'createQueryBuilder')
        .mockReturnValue(taskQueryBuilder as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(true);
      jest
        .spyOn(commentsRepository, 'find')
        .mockResolvedValue([mockComment] as any);

      const result = await service.getTaskComments('task-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(commentsRepository.find).toHaveBeenCalledWith({
        where: { taskId: 'task-1' },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
    });

    it('should throw NotFoundException when task not found', async () => {
      const taskQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(commentsRepository, 'createQueryBuilder')
        .mockReturnValue(taskQueryBuilder as any);

      await expect(service.getTaskComments('task-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      const taskQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          task: { project: { id: 'project-1' } },
        }),
      };

      jest
        .spyOn(commentsRepository, 'createQueryBuilder')
        .mockReturnValue(taskQueryBuilder as any);
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
      const commentWithRelations = {
        ...mockComment,
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(commentWithRelations as any);
      jest
        .spyOn(commentsRepository, 'save')
        .mockResolvedValue(commentWithRelations as any);

      const result = await service.updateComment(
        'comment-1',
        'user-1',
        mockUpdateCommentDto,
      );

      expect(result).toBeInstanceOf(Object);
      expect(commentsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          content: mockUpdateCommentDto.content,
        }),
      );
    });

    it('should update comment when user has admin permission', async () => {
      const commentWithRelations = {
        ...mockComment,
        userId: 'other-user',
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(commentWithRelations as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(true);
      jest
        .spyOn(commentsRepository, 'save')
        .mockResolvedValue(commentWithRelations as any);

      const result = await service.updateComment(
        'comment-1',
        'admin-user',
        mockUpdateCommentDto,
      );

      expect(result).toBeInstanceOf(Object);
      expect(
        projectPermissionService.hasProjectPermission,
      ).toHaveBeenCalledWith('admin-user', 'project-1', ProjectRole.ADMIN);
    });

    it('should throw NotFoundException when comment not found', async () => {
      jest.spyOn(commentsRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.updateComment('comment-1', 'user-1', mockUpdateCommentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not author and lacks admin permission', async () => {
      const commentWithRelations = {
        ...mockComment,
        userId: 'other-user',
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(commentWithRelations as any);
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
      const commentWithRelations = {
        ...mockComment,
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(commentWithRelations as any);
      jest
        .spyOn(commentsRepository, 'remove')
        .mockResolvedValue(commentWithRelations as any);

      await service.deleteComment('comment-1', 'user-1');

      expect(commentsRepository.remove).toHaveBeenCalledWith(
        commentWithRelations,
      );
    });

    it('should delete comment when user has admin permission', async () => {
      const commentWithRelations = {
        ...mockComment,
        userId: 'other-user',
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(commentWithRelations as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(true);
      jest
        .spyOn(commentsRepository, 'remove')
        .mockResolvedValue(commentWithRelations as any);

      await service.deleteComment('comment-1', 'admin-user');

      expect(commentsRepository.remove).toHaveBeenCalledWith(
        commentWithRelations,
      );
    });

    it('should throw NotFoundException when comment not found', async () => {
      jest.spyOn(commentsRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.deleteComment('comment-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not author and lacks admin permission', async () => {
      const commentWithRelations = {
        ...mockComment,
        userId: 'other-user',
        task: {
          project: { id: 'project-1' },
        },
      };

      jest
        .spyOn(commentsRepository, 'findOne')
        .mockResolvedValue(commentWithRelations as any);
      jest
        .spyOn(projectPermissionService, 'hasProjectPermission')
        .mockResolvedValue(false);

      await expect(
        service.deleteComment('comment-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
