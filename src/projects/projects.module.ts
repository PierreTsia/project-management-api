import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { Project } from './entities/project.entity';
import { ProjectContributor } from './entities/project-contributor.entity';
import { ProjectPermissionService } from './services/project-permission.service';
import { LoggerModule } from '../common/services/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectContributor]),
    LoggerModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectPermissionService],
  exports: [ProjectsService, ProjectPermissionService],
})
export class ProjectsModule {}
