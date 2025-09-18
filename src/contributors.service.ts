import { Injectable } from '@nestjs/common';
import type { ContributorAggregateResponseDto } from './dto/contributor-aggregate-response.dto';
import type { ContributorProjectsResponseDto } from './dto/contributor-projects-response.dto';

@Injectable()
export class ContributorsService {
  /**
   * Return an aggregated list of contributors accessible to the current user.
   * Placeholder implementation for scaffold.
   */
  public async listContributors(): Promise<ContributorAggregateResponseDto[]> {
    return [];
  }

  /**
   * Return shared projects for a given contributor.
   * Placeholder implementation for scaffold.
   */
  public async listContributorProjects(
    _userId: string,
  ): Promise<ContributorProjectsResponseDto[]> {
    return [];
  }
}
