import { Injectable } from '@nestjs/common';
import type { ProjectContext } from '../models/project-context.model';
import { ProjectsService } from '../../../projects/projects.service';

@Injectable()
export class ProjectsContextAdapter {
  constructor(private readonly projectsService: ProjectsService) {}

  async getProject(projectId: string): Promise<ProjectContext | undefined> {
    if (!projectId) return undefined;
    try {
      const project = await this.projectsService.findOne(projectId, '');
      return { id: project.id, name: project.name };
    } catch {
      return undefined;
    }
  }
}
