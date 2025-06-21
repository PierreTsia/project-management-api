import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { ProjectContributor } from './entities/project-contributor.entity';
import { ProjectPermissionService } from './services/project-permission.service';
import { ProjectPermissionGuard } from './guards/project-permission.guard';
import { LoggerModule } from '../common/services/logger.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectContributor]),
    LoggerModule,
    UsersModule,
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectPermissionService,
    ProjectPermissionGuard,
  ],
  exports: [ProjectsService, ProjectPermissionService, ProjectPermissionGuard],
})
export class ProjectsModule {}
