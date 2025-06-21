import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from '../services/comments.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { CommentResponseDto } from '../dto/comment-response.dto';
import { ProjectPermissionService } from '../../projects/services/project-permission.service';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { CustomLogger } from '../../common/services/logger.service';
import { MockCustomLogger } from '../../test/mocks';

describe('CommentsController', () => {
  let controller: CommentsController;
  let commentsService: CommentsService;
  let mockLogger: MockCustomLogger;

  const mockCommentResponse: CommentResponseDto = {
    id: 'comment-1',
    content: 'Test comment',
    taskId: 'task-1',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
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

  const mockRequest = {
    user: {
      id: 'user-1',
    },
  };

  beforeEach(async () => {
    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: {
            createComment: jest.fn(),
            getTaskComments: jest.fn(),
            updateComment: jest.fn(),
            deleteComment: jest.fn(),
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
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    commentsService = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      jest
        .spyOn(commentsService, 'createComment')
        .mockResolvedValue(mockCommentResponse);

      const result = await controller.createComment(
        'task-1',
        mockCreateCommentDto,
        mockRequest as any,
        'en',
      );

      expect(result).toEqual(mockCommentResponse);
      expect(commentsService.createComment).toHaveBeenCalledWith(
        'task-1',
        'user-1',
        mockCreateCommentDto,
        'en',
      );
    });
  });

  describe('getTaskComments', () => {
    it('should return comments for a task', async () => {
      const mockComments = [mockCommentResponse];
      jest
        .spyOn(commentsService, 'getTaskComments')
        .mockResolvedValue(mockComments);

      const result = await controller.getTaskComments(
        'task-1',
        mockRequest as any,
        'en',
      );

      expect(result).toEqual(mockComments);
      expect(commentsService.getTaskComments).toHaveBeenCalledWith(
        'task-1',
        'user-1',
        'en',
      );
    });
  });

  describe('updateComment', () => {
    it('should update a comment successfully', async () => {
      jest
        .spyOn(commentsService, 'updateComment')
        .mockResolvedValue(mockCommentResponse);

      const result = await controller.updateComment(
        'comment-1',
        mockUpdateCommentDto,
        mockRequest as any,
        'en',
      );

      expect(result).toEqual(mockCommentResponse);
      expect(commentsService.updateComment).toHaveBeenCalledWith(
        'comment-1',
        'user-1',
        mockUpdateCommentDto,
        'en',
      );
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment successfully', async () => {
      jest.spyOn(commentsService, 'deleteComment').mockResolvedValue(undefined);

      await controller.deleteComment('comment-1', mockRequest as any, 'en');

      expect(commentsService.deleteComment).toHaveBeenCalledWith(
        'comment-1',
        'user-1',
        'en',
      );
    });
  });
});
