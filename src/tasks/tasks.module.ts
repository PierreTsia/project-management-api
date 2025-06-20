import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { CommentsService } from './services/comments.service';
import { CommentsController } from './controllers/comments.controller';
import { ProjectsModule } from '../projects/projects.module';
import { TaskStatusService } from './services/task-status.service';
import { CustomLogger } from '../common/services/logger.service';
import { LoggerModule } from '../common/services/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Comment]),
    ProjectsModule,
    LoggerModule,
  ],
  controllers: [TasksController, CommentsController],
  providers: [TasksService, CommentsService, TaskStatusService, CustomLogger],
  exports: [TasksService, CommentsService],
})
export class TasksModule {}
