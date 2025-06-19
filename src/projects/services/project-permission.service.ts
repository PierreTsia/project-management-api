import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectContributor } from '../entities/project-contributor.entity';
import { ProjectRole } from '../enums/project-role.enum';
import { IProjectPermissionService } from '../interfaces/project-permission.interface';

@Injectable()
export class ProjectPermissionService implements IProjectPermissionService {
  constructor(
    @InjectRepository(ProjectContributor)
    private projectContributorRepository: Repository<ProjectContributor>,
  ) {}

  async hasProjectPermission(
    userId: string,
    projectId: string,
    requiredRole: ProjectRole,
  ): Promise<boolean> {
    const userRole = await this.getUserProjectRole(userId, projectId);

    if (!userRole) {
      return false;
    }

    // Define role hierarchy: OWNER > ADMIN > WRITE > READ
    const roleHierarchy = {
      [ProjectRole.OWNER]: 4,
      [ProjectRole.ADMIN]: 3,
      [ProjectRole.WRITE]: 2,
      [ProjectRole.READ]: 1,
    };

    const userRoleLevel = roleHierarchy[userRole];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    return userRoleLevel >= requiredRoleLevel;
  }

  async getUserProjectRole(
    userId: string,
    projectId: string,
  ): Promise<ProjectRole | null> {
    const contributor = await this.projectContributorRepository.findOne({
      where: {
        userId,
        projectId,
      },
    });

    return contributor?.role || null;
  }
}
