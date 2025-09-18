import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContributorsController } from './contributors.controller';
import { ContributorsService } from './contributors.service';
import { Project } from './projects/entities/project.entity';
import { ProjectContributor } from './projects/entities/project-contributor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project, ProjectContributor])],
  controllers: [ContributorsController],
  providers: [ContributorsService],
})
export class ContributorsModule {}
