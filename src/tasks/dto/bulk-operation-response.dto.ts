import { ApiProperty } from '@nestjs/swagger';

export class BulkOperationResult {
  @ApiProperty({
    description: 'Number of tasks successfully processed',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of tasks that failed to process',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Total number of tasks in the batch',
    example: 10,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Array of task IDs that were successfully processed',
    example: ['task-1', 'task-2', 'task-3'],
  })
  successfulTaskIds: string[];

  @ApiProperty({
    description: 'Array of errors for failed tasks',
    example: [
      { taskId: 'task-4', error: 'Task not found' },
      { taskId: 'task-5', error: 'Insufficient permissions' },
    ],
  })
  errors: Array<{
    taskId: string;
    error: string;
  }>;

  @ApiProperty({
    description: 'Optional message about the operation',
    example: 'Bulk status update completed with 2 failures',
  })
  message?: string;
}

export class BulkOperationResponseDto {
  @ApiProperty({
    description: 'Result of the bulk operation',
    type: BulkOperationResult,
  })
  result: BulkOperationResult;

  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Timestamp of the operation',
    example: '2025-09-13T14:30:00.000Z',
  })
  timestamp: string;
}
