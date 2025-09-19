import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { TaskLink } from './entities/task-link.entity';
import { TaskHierarchy } from './entities/task-hierarchy.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { GlobalTasksController } from './controllers/global-tasks.controller';
import { CommentsService } from './services/comments.service';
import { CommentsController } from './controllers/comments.controller';
import { TaskLinkController } from './controllers/task-link.controller';
import { ProjectsModule } from '../projects/projects.module';
import { TaskStatusService } from './services/task-status.service';
import { CustomLogger } from '../common/services/logger.service';
import { LoggerModule } from '../common/services/logger.module';
import { TaskLinkService } from './services/task-link.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Comment, TaskLink, TaskHierarchy]),
    ProjectsModule,
    LoggerModule,
  ],
  controllers: [
    TasksController,
    GlobalTasksController,
    CommentsController,
    TaskLinkController,
  ],
  providers: [
    TasksService,
    CommentsService,
    TaskStatusService,
    CustomLogger,
    TaskLinkService,
  ],
  exports: [TasksService, CommentsService, TaskLinkService],
})
export class TasksModule {}
