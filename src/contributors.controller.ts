import { Controller, Get, Param } from '@nestjs/common';
import { ContributorsService } from './contributors.service';
import type { ContributorAggregateResponseDto } from './dto/contributor-aggregate-response.dto';
import type { ContributorProjectsResponseDto } from './dto/contributor-projects-response.dto';

@Controller('contributors')
export class ContributorsController {
  constructor(private readonly contributorsService: ContributorsService) {}

  @Get()
  public async list(): Promise<ContributorAggregateResponseDto[]> {
    return this.contributorsService.listContributors();
  }

  @Get(':userId/projects')
  public async listProjects(
    @Param('userId') userId: string,
  ): Promise<ContributorProjectsResponseDto[]> {
    return this.contributorsService.listContributorProjects(userId);
  }
}
