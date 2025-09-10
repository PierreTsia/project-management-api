import {
  Controller,
  Get,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
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
import { DashboardService } from '../services/dashboard.service';
import { DashboardSummaryDto } from '../dto/dashboard-summary.dto';
import { DashboardTaskDto } from '../dto/dashboard-task.dto';
import { DashboardProjectDto } from '../dto/dashboard-project.dto';
import { DashboardQueryDto } from '../dto/dashboard-query.dto';
import { TaskStatus } from '../../tasks/enums/task-status.enum';
import { TaskPriority } from '../../tasks/enums/task-priority.enum';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get dashboard summary statistics',
    description:
      "Returns comprehensive overview of user's projects, tasks, and progress metrics across all accessible projects.",
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
    type: DashboardSummaryDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getSummary(
    @Request() req: { user: User },
  ): Promise<DashboardSummaryDto> {
    return this.dashboardService.getDashboardSummary(req.user.id);
  }

  @Get('my-tasks')
  @ApiOperation({
    summary: 'Get user assigned tasks across all projects',
    description:
      'Returns all tasks assigned to the current user across all projects they have access to, with optional filtering and pagination.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TaskStatus,
    description: 'Filter tasks by status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: TaskPriority,
    description: 'Filter tasks by priority',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter tasks by specific project ID',
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
    description: 'User tasks retrieved successfully',
    type: [DashboardTaskDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getMyTasks(
    @Request() req: { user: User },
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardTaskDto[]> {
    return this.dashboardService.getUserTasks(req.user.id, query);
  }

  @Get('my-projects')
  @ApiOperation({
    summary: 'Get user accessible projects',
    description:
      'Returns all projects the current user has access to, including projects they own and projects they contribute to.',
  })
  @ApiResponse({
    status: 200,
    description: 'User projects retrieved successfully',
    type: [DashboardProjectDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token',
  })
  async getMyProjects(
    @Request() req: { user: User },
  ): Promise<DashboardProjectDto[]> {
    return this.dashboardService.getUserProjects(req.user.id);
  }
}
