import { ApiProperty } from '@nestjs/swagger';

export interface ActivityItem {
  type: string;
  description: string;
  timestamp: Date;
}

export class DashboardSummaryDto {
  @ApiProperty({
    description: 'Total number of projects user has access to',
    example: 5,
  })
  totalProjects: number;

  @ApiProperty({
    description: 'Number of active (non-archived) projects',
    example: 4,
  })
  activeProjects: number;

  @ApiProperty({
    description: 'Number of archived projects',
    example: 1,
  })
  archivedProjects: number;

  @ApiProperty({
    description: 'Total number of tasks across all accessible projects',
    example: 23,
  })
  totalTasks: number;

  @ApiProperty({
    description: 'Number of tasks assigned to the current user',
    example: 8,
  })
  assignedTasks: number;

  @ApiProperty({
    description: 'Number of completed tasks',
    example: 15,
  })
  completedTasks: number;

  @ApiProperty({
    description: 'Number of overdue tasks (past due date and not completed)',
    example: 2,
  })
  overdueTasks: number;

  @ApiProperty({
    description: 'Task breakdown by status',
    type: 'object',
    properties: {
      todo: { type: 'number', example: 6 },
      inProgress: { type: 'number', example: 2 },
      done: { type: 'number', example: 15 },
    },
  })
  tasksByStatus: {
    todo: number;
    inProgress: number;
    done: number;
  };

  @ApiProperty({
    description: 'Task breakdown by priority',
    type: 'object',
    properties: {
      low: { type: 'number', example: 3 },
      medium: { type: 'number', example: 12 },
      high: { type: 'number', example: 8 },
    },
  })
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
  };

  @ApiProperty({
    description: 'Task completion rate as percentage',
    example: 65.2,
  })
  completionRate: number;

  @ApiProperty({
    description: 'Average number of tasks per project',
    example: 4.6,
  })
  averageTasksPerProject: number;

  @ApiProperty({
    description: 'Recent activity timeline',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string', example: 'task_completed' },
        description: {
          type: 'string',
          example: 'Completed "Fix login bug" in Project Alpha',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  recentActivity: ActivityItem[];
}
