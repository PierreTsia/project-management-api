import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProjectPermissionService } from '../services/project-permission.service';
import { ProjectRole } from '../enums/project-role.enum';
import { REQUIRE_PROJECT_ROLE_KEY } from '../decorators/require-project-role.decorator';

@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(
    private projectPermissionService: ProjectPermissionService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.id; // Using 'id' as the parameter name
    const requiredRole = this.reflector.get<ProjectRole>(
      REQUIRE_PROJECT_ROLE_KEY,
      context.getHandler(),
    );

    if (!requiredRole) {
      return true; // No role requirement, allow access
    }

    if (!user || !projectId) {
      throw new ForbiddenException('User or project not found');
    }

    const hasPermission =
      await this.projectPermissionService.hasProjectPermission(
        user.id,
        projectId,
        requiredRole,
      );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have ${requiredRole} permission for this project`,
      );
    }

    return true;
  }
}
