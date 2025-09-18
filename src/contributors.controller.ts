import { Controller, Get, Param, Request } from '@nestjs/common';
import { ContributorsService } from './contributors.service';
import type { ContributorAggregateResponseDto } from './dto/contributor-aggregate-response.dto';
import type { ContributorProjectsResponseDto } from './dto/contributor-projects-response.dto';
import type { User } from './users/entities/user.entity';

@Controller('contributors')
export class ContributorsController {
  constructor(private readonly contributorsService: ContributorsService) {}

  @Get()
  public async list(
    @Request() req: { user: User },
  ): Promise<ContributorAggregateResponseDto[]> {
    return this.contributorsService.listContributors(req.user.id);
  }

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
