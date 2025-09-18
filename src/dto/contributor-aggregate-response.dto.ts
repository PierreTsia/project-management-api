import { ProjectRole } from '../projects/enums/project-role.enum';

export interface ContributorAggregateResponseDto {
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  projectsCount: number;
  projectsPreview: Array<{ id: string; name: string; role: ProjectRole }>;
  roles: Array<ProjectRole>;
}
