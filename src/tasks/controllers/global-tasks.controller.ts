import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../users/entities/user.entity';
import { TasksService } from '../tasks.service';
import { GlobalSearchTasksDto } from '../dto/global-search-tasks.dto';
import { GlobalSearchTasksResponseDto } from '../dto/global-search-tasks-response.dto';
import { TaskResponseDto } from '../dto/task-response.dto';
import { BulkUpdateStatusDto } from '../dto/bulk-update-status.dto';
import { BulkAssignTasksDto } from '../dto/bulk-assign-tasks.dto';
import { BulkDeleteTasksDto } from '../dto/bulk-delete-tasks.dto';
import { BulkOperationResponseDto } from '../dto/bulk-operation-response.dto';

@ApiTags('Global Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('tasks')
export class GlobalTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all user tasks across all accessible projects',
    description:
      'Returns all tasks across all projects the user has access to, with optional filtering and pagination. This endpoint provides workflow-focused task management capabilities.',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    deprecated: true as any,
    description:
      'Deprecated. Use projectIds[]. Sending this param will result in HTTP 400.',
  })
  @ApiResponse({
    status: 200,
    description: 'User tasks retrieved successfully',
    type: GlobalSearchTasksResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAllUserTasks(
    @Request() req: { user: User },
    @Query() searchDto: GlobalSearchTasksDto,
    @Query('projectId') legacyProjectId?: string,
  ): Promise<GlobalSearchTasksResponseDto> {
    // Reject legacy projectId if sent
    if (typeof legacyProjectId === 'string') {
      throw new BadRequestException('Use projectIds[] query param');
    }
    const result = await this.tasksService.findAllUserTasks(
      req.user.id,
      searchDto,
    );

    const totalPages = Math.ceil(result.total / result.limit);
    const hasNextPage = result.page < totalPages;
    const hasPreviousPage = result.page > 1;

    return {
      tasks: result.tasks.map((task) => new TaskResponseDto(task)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search and filter tasks across all accessible projects',
    description:
      'Advanced search and filtering for tasks across all projects the user has access to. Supports text search, status/priority filtering, date ranges, and custom sorting.',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    deprecated: true as any,
    description:
      'Deprecated. Use projectIds[]. Sending this param will result in HTTP 400.',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    type: String,
    description: 'Search query for task title and description',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['TODO', 'IN_PROGRESS', 'DONE'],
    description: 'Filter by task status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    description: 'Filter by task priority',
  })
  @ApiQuery({
    name: 'assigneeId',
    required: false,
    type: String,
    description: 'Filter by specific assignee ID',
  })
  @ApiQuery({
    name: 'projectIds',
    required: false,
    isArray: true,
    type: String,
    description:
      'Filter by list of project IDs. If omitted or empty, search across ALL accessible projects.',
  })
  @ApiQuery({
    name: 'dueDateFrom',
    required: false,
    type: String,
    format: 'date',
    description: 'Filter tasks due after this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'dueDateTo',
    required: false,
    type: String,
    format: 'date',
    description: 'Filter tasks due before this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'createdFrom',
    required: false,
    type: String,
    format: 'date',
    description: 'Filter tasks created after this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'createdTo',
    required: false,
    type: String,
    format: 'date',
    description: 'Filter tasks created before this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'dueDate', 'priority', 'status', 'title'],
    description: 'Field to sort by',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @ApiQuery({
    name: 'assigneeFilter',
    required: false,
    enum: ['me', 'unassigned', 'any'],
    description: 'Filter by assignee type',
  })
  @ApiQuery({
    name: 'isOverdue',
    required: false,
    type: Boolean,
    description: 'Filter for overdue tasks only',
  })
  @ApiQuery({
    name: 'hasDueDate',
    required: false,
    type: Boolean,
    description: 'Filter for tasks with due dates only',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Filtered tasks retrieved successfully',
    type: GlobalSearchTasksResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async searchAllUserTasks(
    @Request() req: { user: User },
    @Query() searchDto: GlobalSearchTasksDto,
    @Query('projectId') legacyProjectId?: string,
  ): Promise<GlobalSearchTasksResponseDto> {
    // Reject legacy projectId if sent
    if (typeof legacyProjectId === 'string') {
      throw new BadRequestException('Use projectIds[] query param');
    }
    const result = await this.tasksService.searchAllUserTasks(
      req.user.id,
      searchDto,
    );

    const totalPages = Math.ceil(result.total / result.limit);
    const hasNextPage = result.page < totalPages;
    const hasPreviousPage = result.page > 1;

    return {
      tasks: result.tasks.map((task) => new TaskResponseDto(task)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };
  }

  @Post('bulk/status')
  @ApiOperation({
    summary: 'Bulk update task status',
    description: 'Update the status of multiple tasks at once',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk status update completed',
    type: BulkOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async bulkUpdateStatus(
    @Request() req: { user: User },
    @Body() bulkUpdateDto: BulkUpdateStatusDto,
  ): Promise<BulkOperationResponseDto> {
    return await this.tasksService.bulkUpdateStatus(req.user.id, bulkUpdateDto);
  }

  @Post('bulk/assign')
  @ApiOperation({
    summary: 'Bulk assign tasks',
    description: 'Assign multiple tasks to a user at once',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk assignment completed',
    type: BulkOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async bulkAssignTasks(
    @Request() req: { user: User },
    @Body() bulkAssignDto: BulkAssignTasksDto,
  ): Promise<BulkOperationResponseDto> {
    return await this.tasksService.bulkAssignTasks(req.user.id, bulkAssignDto);
  }

  @Post('bulk/delete')
  @ApiOperation({
    summary: 'Bulk delete tasks',
    description: 'Delete multiple tasks at once',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk deletion completed',
    type: BulkOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async bulkDeleteTasks(
    @Request() req: { user: User },
    @Body() bulkDeleteDto: BulkDeleteTasksDto,
  ): Promise<BulkOperationResponseDto> {
    return await this.tasksService.bulkDeleteTasks(req.user.id, bulkDeleteDto);
  }
}
