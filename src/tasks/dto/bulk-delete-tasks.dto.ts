import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class BulkDeleteTasksDto {
  @ApiProperty({
    description: 'Array of task IDs to delete',
    example: ['task-1', 'task-2', 'task-3'],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one task ID is required' })
  @ArrayMaxSize(100, { message: 'Maximum 100 tasks can be deleted at once' })
  @IsString({ each: true })
  taskIds: string[];

  @ApiProperty({
    description: 'Optional reason for the deletion',
    example: 'Cleaning up duplicate tasks from migration',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
