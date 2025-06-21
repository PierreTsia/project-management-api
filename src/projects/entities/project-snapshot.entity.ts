import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('project_snapshots')
export class ProjectSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  // Task metrics
  @Column({ name: 'total_tasks', default: 0 })
  totalTasks: number;

  @Column({ name: 'completed_tasks', default: 0 })
  completedTasks: number;

  @Column({ name: 'in_progress_tasks', default: 0 })
  inProgressTasks: number;

  @Column({ name: 'todo_tasks', default: 0 })
  todoTasks: number;

  @Column({ name: 'new_tasks_today', default: 0 })
  newTasksToday: number;

  @Column({ name: 'completed_tasks_today', default: 0 })
  completedTasksToday: number;

  // Activity metrics
  @Column({ name: 'comments_added_today', default: 0 })
  commentsAddedToday: number;

  @Column({ name: 'attachments_uploaded_today', default: 0 })
  attachmentsUploadedToday: number;

  // Calculated fields
  @Column({
    name: 'completion_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  completionPercentage: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @CreateDateColumn()
  createdAt: Date;
}
