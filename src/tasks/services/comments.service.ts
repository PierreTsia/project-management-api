import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { Comment } from '../entities/comment.entity';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { CommentResponseDto } from '../dto/comment-response.dto';
import { ProjectPermissionService } from '../../projects/services/project-permission.service';
import { ProjectRole } from '../../projects/enums/project-role.enum';
import { TasksService } from '../tasks.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    private readonly tasksService: TasksService,
    private readonly projectPermissionService: ProjectPermissionService,
    private readonly i18n: I18nService,
  ) {}

  async createComment(
    taskId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
    acceptLanguage?: string,
  ): Promise<CommentResponseDto> {
    // First get the task to validate it exists and get its projectId
    const task = await this.tasksService.findById(taskId, acceptLanguage);

    const hasPermission =
      await this.projectPermissionService.hasProjectPermission(
        userId,
        task.projectId,
        ProjectRole.READ,
      );

    if (!hasPermission) {
      throw new ForbiddenException({
        status: 403,
        code: 'COMMENTS.INSUFFICIENT_PERMISSION',
        message: this.i18n.translate(
          'errors.comments.insufficient_permission',
          {
            lang: acceptLanguage,
          },
        ),
      });
    }

    const comment = this.commentsRepository.create({
      content: createCommentDto.content,
      taskId,
      userId,
    });

    const savedComment = await this.commentsRepository.save(comment);
    return new CommentResponseDto(savedComment);
  }

  async getTaskComments(
    taskId: string,
    userId: string,
    acceptLanguage?: string,
  ): Promise<CommentResponseDto[]> {
    // First get the task to validate it exists and get its projectId
    const task = await this.tasksService.findById(taskId, acceptLanguage);

    const hasPermission =
      await this.projectPermissionService.hasProjectPermission(
        userId,
        task.projectId,
        ProjectRole.READ,
      );

    if (!hasPermission) {
      throw new ForbiddenException({
        status: 403,
        code: 'COMMENTS.CANNOT_VIEW_COMMENTS',
        message: this.i18n.translate('errors.comments.cannot_view_comments', {
          lang: acceptLanguage,
        }),
      });
    }

    const comments = await this.commentsRepository.find({
      where: { taskId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return comments.map((comment) => new CommentResponseDto(comment));
  }

  async updateComment(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
    acceptLanguage?: string,
  ): Promise<CommentResponseDto> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: ['task', 'task.project'],
    });

    if (!comment) {
      throw new NotFoundException({
        status: 404,
        code: 'COMMENTS.COMMENT_NOT_FOUND',
        message: this.i18n.translate('errors.comments.comment_not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    // Check if user is the comment author or has admin permissions
    const isAuthor = comment.userId === userId;
    const hasAdminPermission =
      await this.projectPermissionService.hasProjectPermission(
        userId,
        comment.task.project.id,
        ProjectRole.ADMIN,
      );

    if (!isAuthor && !hasAdminPermission) {
      throw new ForbiddenException({
        status: 403,
        code: 'COMMENTS.CANNOT_EDIT_COMMENT',
        message: this.i18n.translate('errors.comments.cannot_edit_comment', {
          lang: acceptLanguage,
        }),
      });
    }

    if (updateCommentDto.content !== undefined) {
      comment.content = updateCommentDto.content;
    }

    const updatedComment = await this.commentsRepository.save(comment);
    return new CommentResponseDto(updatedComment);
  }

  async deleteComment(
    commentId: string,
    userId: string,
    acceptLanguage?: string,
  ): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: ['task', 'task.project'],
    });

    if (!comment) {
      throw new NotFoundException({
        status: 404,
        code: 'COMMENTS.COMMENT_NOT_FOUND',
        message: this.i18n.translate('errors.comments.comment_not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    // Check if user is the comment author or has admin permissions
    const isAuthor = comment.userId === userId;
    const hasAdminPermission =
      await this.projectPermissionService.hasProjectPermission(
        userId,
        comment.task.project.id,
        ProjectRole.ADMIN,
      );

    if (!isAuthor && !hasAdminPermission) {
      throw new ForbiddenException({
        status: 403,
        code: 'COMMENTS.CANNOT_DELETE_COMMENT',
        message: this.i18n.translate('errors.comments.cannot_delete_comment', {
          lang: acceptLanguage,
        }),
      });
    }

    await this.commentsRepository.remove(comment);
  }

  async getCommentsCountForProjectAndDateRange(
    projectId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    try {
      this.logger.debug(
        `Getting comments count for project ${projectId} between ${startDate.toISOString()} and ${endDate.toISOString()}`,
      );

      const count = await this.commentsRepository
        .createQueryBuilder('comment')
        .innerJoin('comment.task', 'task')
        .where('task.projectId = :projectId', { projectId })
        .andWhere('comment.createdAt >= :startDate', { startDate })
        .andWhere('comment.createdAt <= :endDate', { endDate })
        .getCount();

      this.logger.debug(
        `Found ${count} comments for project ${projectId} in date range`,
      );

      return count;
    } catch (error) {
      this.logger.error(
        `Error getting comments count for project ${projectId}:`,
        error.stack,
      );
      // Return 0 instead of throwing to prevent snapshot generation from failing
      return 0;
    }
  }
}
