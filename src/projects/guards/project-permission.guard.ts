import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';
import { ProjectPermissionService } from '../services/project-permission.service';
import { ProjectRole } from '../enums/project-role.enum';
import { REQUIRE_PROJECT_ROLE_KEY } from '../decorators/require-project-role.decorator';

@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(
    private projectPermissionService: ProjectPermissionService,
    private reflector: Reflector,
    private i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const projectId = request.params.id || request.params.projectId; // Handle both parameter names
    const requiredRole = this.reflector.get<ProjectRole>(
      REQUIRE_PROJECT_ROLE_KEY,
      context.getHandler(),
    );

    if (!requiredRole) {
      return true; // No role requirement, allow access
    }

    if (!user || !projectId) {
      throw new ForbiddenException(
        this.i18n.translate('errors.project.user_or_project_not_found'),
      );
    }

    const hasPermission =
      await this.projectPermissionService.hasProjectPermission(
        user.id,
        projectId,
        requiredRole,
      );

    if (!hasPermission) {
      throw new ForbiddenException(
        this.i18n.translate('errors.project.insufficient_permission', {
          args: { role: requiredRole },
        }),
      );
    }

    return true;
  }
}
