import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectSnapshot } from './entities/project-snapshot.entity';
import { ProjectSnapshotService } from './services/project-snapshot.service';
import { ReportingController } from './reporting.controller';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { AttachmentsModule } from '../attachments/attachments.module';
import { LoggerModule } from '../common/services/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectSnapshot]),
    ProjectsModule,
    TasksModule,
    AttachmentsModule,
    LoggerModule,
  ],
  controllers: [ReportingController],
  providers: [ProjectSnapshotService],
  exports: [ProjectSnapshotService],
})
export class ReportingModule {}
