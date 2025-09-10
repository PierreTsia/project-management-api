import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../../tasks/enums/task-status.enum';
import { TaskPriority } from '../../tasks/enums/task-priority.enum';

export class DashboardTaskDto {
  @ApiProperty({
    description: 'Unique task identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Task title',
    example: 'Fix authentication bug',
  })
  title: string;

  @ApiProperty({
    description: 'Task description',
    example: 'Fix the login issue where users cannot authenticate with OAuth',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Current task status',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  status: TaskStatus;

  @ApiProperty({
    description: 'Task priority level',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  priority: TaskPriority;

  @ApiProperty({
    description: 'Task due date',
    example: '2024-01-20T17:00:00Z',
    required: false,
  })
  dueDate?: Date;

  @ApiProperty({
    description: 'Project information',
    type: 'object',
    properties: {
      id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
      name: { type: 'string', example: 'Project Alpha' },
    },
  })
  project: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Task assignee information',
    type: 'object',
    properties: {
      id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440002' },
      name: { type: 'string', example: 'John Doe' },
    },
    required: ['id', 'name'],
  })
  assignee?: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Task creation timestamp',
    example: '2024-01-10T09:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Task last update timestamp',
    example: '2024-01-15T14:30:00Z',
  })
  updatedAt: Date;
}
