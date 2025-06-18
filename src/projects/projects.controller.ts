import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  Headers,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { User } from '../users/entities/user.entity';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async create(
    @Request() req: { user: User },
    @Body() createProjectDto: CreateProjectDto,
    @Headers('accept-language') _acceptLanguage?: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.create(
      createProjectDto,
      req.user.id,
    );
    return new ProjectResponseDto(project);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all projects for the current user',
    type: [ProjectResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAll(@Request() req: { user: User }): Promise<ProjectResponseDto[]> {
    const projects = await this.projectsService.findAll(req.user.id);
    return projects.map((project) => new ProjectResponseDto(project));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project by ID' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the project',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findOne(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.findOne(
      id,
      req.user.id,
      acceptLanguage,
    );
    return new ProjectResponseDto(project);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async update(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.update(
      id,
      updateProjectDto,
      req.user.id,
      acceptLanguage,
    );
    return new ProjectResponseDto(project);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 204,
    description: 'Project deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async remove(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<void> {
    await this.projectsService.remove(id, req.user.id, acceptLanguage);
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive a project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project archived successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async archive(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.archive(
      id,
      req.user.id,
      acceptLanguage,
    );
    return new ProjectResponseDto(project);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate an archived project' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project activated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async activate(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectsService.activate(
      id,
      req.user.id,
      acceptLanguage,
    );
    return new ProjectResponseDto(project);
  }
}
