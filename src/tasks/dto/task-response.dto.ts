import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Task } from '../entities/task.entity';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

@Exclude()
export class TaskResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Task unique identifier',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Task title',
    example: 'Implement user authentication',
  })
  title: string;

  @Expose()
  @ApiProperty({
    description: 'Task description',
    example: 'Use JWT for authentication and Passport.js for strategy.',
    nullable: true,
  })
  description?: string;

  @Expose()
  @ApiProperty({
    description: 'Task status',
    enum: TaskStatus,
    example: TaskStatus.TODO,
  })
  status: TaskStatus;

  @Expose()
  @ApiProperty({
    description: 'Task priority',
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Expose()
  @ApiProperty({
    description: 'Task due date',
    example: '2024-12-31T23:59:59.999Z',
    nullable: true,
  })
  dueDate?: Date;

  @Expose()
  @ApiProperty({
    description: 'ID of the project this task belongs to',
    example: 'b1c2d3e4-f5g6-7890-1234-567890abcdef',
  })
  projectId: string;

  @Expose()
  @ApiProperty({
    description: 'ID of the user this task is assigned to',
    example: 'c1d2e3f4-g5h6-7890-1234-567890abcdef',
    nullable: true,
  })
  assigneeId?: string;

  @Expose()
  @ApiProperty({
    description: 'Task creation date',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Task last update date',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<Task>) {
    Object.assign(this, partial);
  }
}
