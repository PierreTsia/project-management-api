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
  HttpCode,
  HttpStatus,
  Headers,
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
    return new TaskResponseDto(task);
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
    return tasks.map((task) => new TaskResponseDto(task));
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
    return new TaskResponseDto(task);
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
}
