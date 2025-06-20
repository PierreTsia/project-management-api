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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  @ApiOperation({ summary: 'Create a new task in a project' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  async create(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    const task = await this.tasksService.create(createTaskDto, projectId);
    return new TaskResponseDto(task);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks for a project' })
  @ApiResponse({
    status: 200,
    description: 'Returns all tasks for the project',
    type: [TaskResponseDto],
  })
  async findAll(
    @Param('projectId') projectId: string,
  ): Promise<TaskResponseDto[]> {
    const tasks = await this.tasksService.findAll(projectId);
    return tasks.map((task) => new TaskResponseDto(task));
  }

  @Get(':taskId')
  @ApiOperation({ summary: 'Get a specific task by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the task',
    type: TaskResponseDto,
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
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<void> {
    await this.tasksService.remove(taskId, projectId, acceptLanguage);
  }
}
