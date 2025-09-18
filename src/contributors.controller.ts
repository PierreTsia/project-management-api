import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ContributorsService } from './contributors.service';
import type { ContributorsListResponseDto } from './dto/contributors-list-response.dto';
import type { ContributorProjectsResponseDto } from './dto/contributor-projects-response.dto';
import type { User } from './users/entities/user.entity';
import { ListContributorsQueryDto } from './dto/list-contributors-query.dto';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  SwaggerContributorsListDto,
  SwaggerContributorProjectsDto,
} from './dto/swagger-contributors.dto';

@ApiTags('Contributors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('contributors')
export class ContributorsController {
  constructor(private readonly contributorsService: ContributorsService) {}

  @ApiOperation({
    summary: 'List aggregated contributors across accessible projects',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search by name or email',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter by role (READ, WRITE, ADMIN, OWNER)',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Restrict to a single project',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default 1)',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Page size (default 20)',
  })
  @ApiOkResponse({
    description: 'Contributors list with pagination meta',
    type: SwaggerContributorsListDto,
  })
  @Get()
  public async list(
    @Request() req: { user: User },
    @Query() query: ListContributorsQueryDto,
  ): Promise<ContributorsListResponseDto> {
    return this.contributorsService.listContributors(req.user.id, query);
  }

  @ApiOperation({ summary: 'List shared projects with a given contributor' })
  @ApiParam({ name: 'userId', description: 'Contributor user ID' })
  @ApiOkResponse({
    description: 'Shared projects list',
    type: SwaggerContributorProjectsDto,
    isArray: true,
  })
  @Get(':userId/projects')
  public async listProjects(
    @Param('userId') userId: string,
    @Request() req: { user: User },
  ): Promise<ContributorProjectsResponseDto[]> {
    return this.contributorsService.listContributorProjects(
      userId,
      req.user.id,
    );
  }
}
