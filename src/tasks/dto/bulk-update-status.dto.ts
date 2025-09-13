import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum';

export class BulkUpdateStatusDto {
  @ApiProperty({
    description: 'Array of task IDs to update',
    example: ['task-1', 'task-2', 'task-3'],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one task ID is required' })
  @ArrayMaxSize(100, { message: 'Maximum 100 tasks can be updated at once' })
  @IsString({ each: true })
  taskIds: string[];

  @ApiProperty({
    description: 'New status to set for all tasks',
    enum: TaskStatus,
    example: TaskStatus.DONE,
  })
  @IsEnum(TaskStatus, { message: 'Invalid task status' })
  status: TaskStatus;

  @ApiProperty({
    description: 'Optional reason for the status change',
    example: 'All tasks completed as part of sprint 1',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
