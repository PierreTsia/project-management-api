import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
} from '@nestjs/swagger';
import { TaskLinkService } from '../services/task-link.service';
import { CreateTaskLinkDto } from '../dto/create-task-link.dto';
import { TaskLinkDto } from '../dto/task-link.dto';
import { TaskLinkResponseDto } from '../dto/task-link-response.dto';

@ApiTags('Task Links')
@Controller('projects/:projectId/tasks/:taskId/links')
export class TaskLinkController {
  constructor(private readonly taskLinkService: TaskLinkService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task link' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiCreatedResponse({ type: TaskLinkDto })
  async createLink(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: Omit<CreateTaskLinkDto, 'projectId' | 'sourceTaskId'>,
  ): Promise<TaskLinkDto> {
    const created = await this.taskLinkService.createLink({
      projectId,
      sourceTaskId: taskId,
      targetTaskId: body.targetTaskId,
      type: body.type,
    });
    return new TaskLinkDto(created);
  }

  @Get()
  @ApiOperation({ summary: 'List links for a task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiOkResponse({ type: TaskLinkResponseDto })
  async list(@Param('taskId') taskId: string): Promise<TaskLinkResponseDto> {
    const response = await this.taskLinkService.listLinksByTask(taskId);
    return new TaskLinkResponseDto(response);
  }

  @Delete(':linkId')
  @ApiOperation({ summary: 'Delete a task link' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'taskId', format: 'uuid' })
  @ApiParam({ name: 'linkId', format: 'uuid' })
  @ApiOkResponse({ description: 'Deleted' })
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
}
