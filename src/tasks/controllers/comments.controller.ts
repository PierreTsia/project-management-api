import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Headers,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from '../../projects/guards/project-permission.guard';
import { RequireProjectRole } from '../../projects/decorators/require-project-role.decorator';
import { ProjectRole } from '../../projects/enums/project-role.enum';
import { CommentsService } from '../services/comments.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { CommentResponseDto } from '../dto/comment-response.dto';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('projects/:projectId/tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Create a new comment on a task' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiBody({
    type: CreateCommentDto,
    description: 'Comment data to create',
  })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or task not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async createComment(
    @Param('taskId') taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<CommentResponseDto> {
    return this.commentsService.createComment(
      taskId,
      req.user.id,
      createCommentDto,
      acceptLanguage,
    );
  }

  @Get()
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all comments for the task',
    type: [CommentResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or task not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getTaskComments(
    @Param('taskId') taskId: string,
    @Request() req,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<CommentResponseDto[]> {
    return this.commentsService.getTaskComments(
      taskId,
      req.user.id,
      acceptLanguage,
    );
  }

  @Put(':commentId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiBody({
    type: UpdateCommentDto,
    description: 'Comment data to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: CommentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions or not comment author',
  })
  @ApiResponse({
    status: 404,
    description: 'Project, task, or comment not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<CommentResponseDto> {
    return this.commentsService.updateComment(
      commentId,
      req.user.id,
      updateCommentDto,
      acceptLanguage,
    );
  }

  @Delete(':commentId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 204,
    description: 'Comment deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions or not comment author',
  })
  @ApiResponse({
    status: 404,
    description: 'Project, task, or comment not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async deleteComment(
    @Param('commentId') commentId: string,
    @Request() req,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<void> {
    return this.commentsService.deleteComment(
      commentId,
      req.user.id,
      acceptLanguage,
    );
  }
}
