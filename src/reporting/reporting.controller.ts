import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  Headers,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectProgressDto } from '../projects/dto/project-progress.dto';
import { User } from '../users/entities/user.entity';
import { ProjectRole } from '../projects/enums/project-role.enum';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { RequireProjectRole } from '../projects/decorators/require-project-role.decorator';
import { ProjectSnapshotService } from './services/project-snapshot.service';

@ApiTags('Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reporting')
export class ReportingController {
  constructor(
    private readonly projectSnapshotService: ProjectSnapshotService,
  ) {}

  @Get('projects/:id/progress')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectRole(ProjectRole.READ)
  @ApiOperation({ summary: 'Get project progress' })
  @ApiParam({ name: 'id', description: 'Project ID' })
  @ApiQuery({ name: 'trends', description: 'Include trends', required: false })
  @ApiQuery({
    name: 'activity',
    description: 'Include activity data',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns project progress',
    type: ProjectProgressDto,
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
  async getProjectProgress(
    @Request() req: { user: User },
    @Param('id') id: string,
    @Query('trends') includeTrends: boolean,
    @Query('activity') includeActivity: boolean,
    @Headers('accept-language') _acceptLanguage?: string,
  ): Promise<ProjectProgressDto> {
    const progress = await this.projectSnapshotService.getProjectProgress(
      id,
      includeTrends,
      includeActivity,
      30, // Default to 30 days
    );
    return progress;
  }
}
