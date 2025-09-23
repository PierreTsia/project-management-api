import { Injectable } from '@nestjs/common';
import type { TeamMemberContext } from '../models/team-member-context.model';
import { ProjectsService } from '../../../projects/projects.service';

@Injectable()
export class TeamContextAdapter {
  constructor(private readonly projectsService: ProjectsService) {}

  async getTeam(projectId: string): Promise<ReadonlyArray<TeamMemberContext>> {
    if (!projectId) return [];
    const contributors = await this.projectsService.getContributors(projectId);
    return contributors.map((c) => ({
      id: c.userId,
      displayName: c.user?.name ?? c.userId,
    }));
  }
}
