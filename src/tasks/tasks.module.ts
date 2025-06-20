import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { I18nModule } from 'nestjs-i18n';
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { CommentsService } from './services/comments.service';
import { CommentsController } from './controllers/comments.controller';
import { ProjectsModule } from '../projects/projects.module';
import { TaskStatusService } from './services/task-status.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Comment]),
    ProjectsModule,
    I18nModule,
  ],
  controllers: [TasksController, CommentsController],
  providers: [TasksService, CommentsService, TaskStatusService],
  exports: [TasksService],
})
export class TasksModule {}
