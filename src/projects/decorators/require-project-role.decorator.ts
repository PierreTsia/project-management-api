import { SetMetadata } from '@nestjs/common';
import { ProjectRole } from '../enums/project-role.enum';

export const REQUIRE_PROJECT_ROLE_KEY = 'requiredRole';
export const RequireProjectRole = (role: ProjectRole) =>
  SetMetadata(REQUIRE_PROJECT_ROLE_KEY, role);
