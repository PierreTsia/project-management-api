import {
  Controller,
  Post,
  Delete,
  Get,
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
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectPermissionGuard } from '../../projects/guards/project-permission.guard';
import { RequireProjectRole } from '../../projects/decorators/require-project-role.decorator';
import { ProjectRole } from '../../projects/enums/project-role.enum';
import { TaskHierarchyService } from '../services/task-hierarchy.service';
import { TaskHierarchyDto } from '../dto/task-hierarchy.dto';
import { HierarchyTreeDto } from '../dto/hierarchy-tree.dto';

@ApiTags('Task Hierarchy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('projects/:projectId/tasks/:parentTaskId/hierarchy')
export class TaskHierarchyController {
  constructor(private readonly taskHierarchyService: TaskHierarchyService) {}

  @Post(':childTaskId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.WRITE)
  @ApiOperation({ summary: 'Create a parent-child task relationship' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'parentTaskId', format: 'uuid' })
  @ApiParam({ name: 'childTaskId', format: 'uuid' })
  @ApiCreatedResponse({ type: TaskHierarchyDto })
  async createHierarchy(
    @Param('projectId') projectId: string,
    @Param('parentTaskId') parentTaskId: string,
    @Param('childTaskId') childTaskId: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<TaskHierarchyDto> {
    const hierarchy = await this.taskHierarchyService.createHierarchy(
      {
        projectId,
        parentTaskId,
        childTaskId,
      },
      acceptLanguage,
    );
    return new TaskHierarchyDto({
      id: hierarchy.id,
      projectId: hierarchy.projectId,
      parentTaskId: hierarchy.parentTaskId,
      childTaskId: hierarchy.childTaskId,
      createdAt: hierarchy.createdAt,
    });
  }

  @Delete(':childTaskId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a parent-child task relationship' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'parentTaskId', format: 'uuid' })
  @ApiParam({ name: 'childTaskId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Deleted' })
  async deleteHierarchy(
    @Param('projectId') projectId: string,
    @Param('parentTaskId') parentTaskId: string,
    @Param('childTaskId') childTaskId: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<void> {
    await this.taskHierarchyService.deleteHierarchy(
      projectId,
      parentTaskId,
      childTaskId,
      acceptLanguage,
    );
  }

  @Get()
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({
    summary: 'Get complete hierarchy (parents and children) for a task',
  })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'parentTaskId', format: 'uuid' })
  @ApiOkResponse({ type: HierarchyTreeDto })
  async getHierarchy(
    @Param('parentTaskId') taskId: string,
  ): Promise<HierarchyTreeDto> {
    return this.taskHierarchyService.getHierarchyForTask(taskId);
  }

  @Get('children')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get direct children of a task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'parentTaskId', format: 'uuid' })
  @ApiOkResponse({ type: [TaskHierarchyDto] })
  async getChildren(
    @Param('parentTaskId') taskId: string,
  ): Promise<TaskHierarchyDto[]> {
    return this.taskHierarchyService.getChildrenForTask(taskId);
  }

  @Get('parents')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get direct parents of a task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'parentTaskId', format: 'uuid' })
  @ApiOkResponse({ type: [TaskHierarchyDto] })
  async getParents(
    @Param('parentTaskId') taskId: string,
  ): Promise<TaskHierarchyDto[]> {
    return this.taskHierarchyService.getParentsForTask(taskId);
  }

  @Get('all-children')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get all children (recursive) of a task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'parentTaskId', format: 'uuid' })
  @ApiOkResponse({ type: [TaskHierarchyDto] })
  async getAllChildren(
    @Param('parentTaskId') taskId: string,
  ): Promise<TaskHierarchyDto[]> {
    return this.taskHierarchyService.getAllChildrenForTask(taskId);
  }

  @Get('all-parents')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get all parents (recursive) of a task' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'parentTaskId', format: 'uuid' })
  @ApiOkResponse({ type: [TaskHierarchyDto] })
  async getAllParents(
    @Param('parentTaskId') taskId: string,
  ): Promise<TaskHierarchyDto[]> {
    return this.taskHierarchyService.getAllParentsForTask(taskId);
  }
}
