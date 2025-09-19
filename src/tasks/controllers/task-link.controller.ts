import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiBearerAuth,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from '../../projects/guards/project-permission.guard';
import { RequireProjectRole } from '../../projects/decorators/require-project-role.decorator';
import { ProjectRole } from '../../projects/enums/project-role.enum';
import { Throttle } from '@nestjs/throttler';
import { TaskLinkService } from '../services/task-link.service';
import { CreateTaskLinkBodyDto } from '../dto/create-task-link-body.dto';
import { TaskLinkDto } from '../dto/task-link.dto';
import { TaskLinkResponseDto } from '../dto/task-link-response.dto';
import { TaskLinkWithTaskDto } from '../dto/task-link-with-task.dto';

@ApiTags('Task Links')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('projects/:projectId/tasks/:taskId')
export class TaskLinkController {
  constructor(private readonly taskLinkService: TaskLinkService) {}

  @Post('links')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.WRITE)
  @ApiOperation({ summary: 'Create a task link' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiCreatedResponse({ type: TaskLinkDto })
  async createLink(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: CreateTaskLinkBodyDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<TaskLinkDto> {
    const created = await this.taskLinkService.createLink(
      {
        projectId,
        sourceTaskId: taskId,
        targetTaskId: body.targetTaskId,
        type: body.type,
      },
      acceptLanguage,
    );
    return new TaskLinkDto(created);
  }

  @Get('links')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'List links for a task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOkResponse({ type: TaskLinkResponseDto })
  async list(@Param('taskId') taskId: string): Promise<TaskLinkResponseDto> {
    const response = await this.taskLinkService.listLinksByTask(taskId);
    return new TaskLinkResponseDto(response);
  }

  @Delete(':linkId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task link' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiParam({ name: 'linkId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Deleted' })
  async delete(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('linkId') linkId: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<void> {
    await this.taskLinkService.deleteLink(
      projectId,
      taskId,
      linkId,
      acceptLanguage,
    );
  }

  @Get('related')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'List related task ids for a task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOkResponse({ type: [String] })
  async listRelated(@Param('taskId') taskId: string): Promise<string[]> {
    return this.taskLinkService.listRelatedTaskIds(taskId);
  }

  @Get('links/detailed')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'List links with full task details for a task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOkResponse({ type: [TaskLinkWithTaskDto] })
  async listLinksDetailed(
    @Param('taskId') taskId: string,
  ): Promise<TaskLinkWithTaskDto[]> {
    return this.taskLinkService.listLinksWithTasks(taskId);
  }
}
