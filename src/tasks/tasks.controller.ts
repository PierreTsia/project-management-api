import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpCode,
  HttpStatus,
  Headers,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { RequireProjectRole } from '../projects/decorators/require-project-role.decorator';
import { ProjectRole } from '../projects/enums/project-role.enum';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { SearchTasksDto } from './dto/search-tasks.dto';
import { SearchTasksResponseDto } from './dto/search-tasks-response.dto';
import { TaskResponseDto } from './dto/task-response.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.WRITE)
  @ApiOperation({ summary: 'Create a new task in a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
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
    description: 'Project not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async create(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    const task = await this.tasksService.create(createTaskDto, projectId);
    return new TaskResponseDto(
      task,
      await this.tasksService.getTaskLinks(task.id),
    );
  }

  @Get()
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get all tasks for a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all tasks for the project',
    type: [TaskResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(
    @Param('projectId') projectId: string,
  ): Promise<TaskResponseDto[]> {
    const tasks = await this.tasksService.findAll(projectId);
    const linksMap = await this.tasksService.getLinksMap(
      tasks.map((t) => t.id),
    );
    return tasks.map(
      (task) => new TaskResponseDto(task, linksMap.get(task.id)),
    );
  }

  @Get('search')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Search and filter tasks in a project' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns filtered and paginated tasks',
    type: SearchTasksResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async searchTasks(
    @Param('projectId') projectId: string,
    @Query() searchDto: SearchTasksDto,
  ): Promise<SearchTasksResponseDto> {
    const result = await this.tasksService.searchTasks(projectId, searchDto);
    const linksMap = await this.tasksService.getLinksMap(
      result.tasks.map((t) => t.id),
    );
    return {
      tasks: result.tasks.map(
        (task) => new TaskResponseDto(task, linksMap.get(task.id)),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':taskId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get a specific task by ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the task',
    type: TaskResponseDto,
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
  async findOne(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<TaskResponseDto> {
    const task = await this.tasksService.findOne(
      taskId,
      projectId,
      acceptLanguage,
    );
    const relationships = await this.tasksService.getTaskWithRelationships(
      task.id,
    );
    return new TaskResponseDto(
      task,
      relationships.links,
      relationships.hierarchy,
    );
  }

  @Put(':taskId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.WRITE)
  @ApiOperation({ summary: 'Update a task' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
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
  async update(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<TaskResponseDto> {
    const task = await this.tasksService.update(
      taskId,
      projectId,
      updateTaskDto,
      acceptLanguage,
    );
    return new TaskResponseDto(task);
  }

  @Delete(':taskId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
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
  async remove(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<void> {
    await this.tasksService.remove(taskId, projectId, acceptLanguage);
  }

  @Put(':taskId/status')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.WRITE)
  @ApiOperation({ summary: 'Update task status (assignee only)' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task status updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or invalid status transition',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only assignee can update task status',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or task not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async updateStatus(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
    @Request() req: any,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<TaskResponseDto> {
    const task = await this.tasksService.updateStatus(
      taskId,
      projectId,
      updateTaskStatusDto,
      req.user.id,
      acceptLanguage,
    );
    return new TaskResponseDto(task);
  }

  @Put(':taskId/assign')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.WRITE)
  @ApiOperation({ summary: 'Assign task to a user' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task assigned successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or invalid assignee',
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
  async assignTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() assignTaskDto: AssignTaskDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<TaskResponseDto> {
    const task = await this.tasksService.assignTask(
      taskId,
      projectId,
      assignTaskDto.assigneeId,
      acceptLanguage,
    );
    return new TaskResponseDto(task);
  }

  @Delete(':taskId/assign')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.WRITE)
  @ApiOperation({ summary: 'Unassign task from current user' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task unassigned successfully',
    type: TaskResponseDto,
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
  async unassignTask(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<TaskResponseDto> {
    const task = await this.tasksService.unassignTask(
      taskId,
      projectId,
      acceptLanguage,
    );
    return new TaskResponseDto(task);
  }
}
