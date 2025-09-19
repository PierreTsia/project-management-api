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

/**
 * Represents a parent-child relationship between tasks within the same project.
 */
@Entity('task_hierarchy')
export class TaskHierarchy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'parent_task_id' })
  parentTaskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask: Task;

  @Column({ name: 'child_task_id' })
  childTaskId: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_task_id' })
  childTask: Task;

  @CreateDateColumn()
  createdAt: Date;
}
