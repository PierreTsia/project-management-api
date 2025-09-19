import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Task } from './task.entity';
import { TASK_LINK_TYPES, TaskLinkType } from '../enums/task-link-type.enum';

/**
 * Represents a directional relationship between two tasks within the same project.
 */
@Entity('task_links')
export class TaskLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'source_task_id' })
  sourceTaskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_task_id' })
  sourceTask: Task;

  @Column({ name: 'target_task_id' })
  targetTaskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_task_id' })
  targetTask: Task;

  @Column({ type: 'enum', enum: TASK_LINK_TYPES })
  type: TaskLinkType;

  @CreateDateColumn()
  createdAt: Date;
}
