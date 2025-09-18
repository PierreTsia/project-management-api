import { ProjectRole } from '../projects/enums/project-role.enum';

export type ContributorProjectsResponseDto = {
  projectId: string;
  name: string;
  role: ProjectRole;
};
