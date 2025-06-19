import { ProjectRole } from '../enums/project-role.enum';

export interface IProjectPermissionService {
  hasProjectPermission(
    userId: string,
    projectId: string,
    requiredRole: ProjectRole,
  ): Promise<boolean>;

  getUserProjectRole(
    userId: string,
    projectId: string,
  ): Promise<ProjectRole | null>;
}
