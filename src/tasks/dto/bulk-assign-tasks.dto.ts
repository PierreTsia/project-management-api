import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class BulkAssignTasksDto {
  @ApiProperty({
    description: 'Array of task IDs to assign',
    example: ['task-1', 'task-2', 'task-3'],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one task ID is required' })
  @ArrayMaxSize(100, { message: 'Maximum 100 tasks can be assigned at once' })
  @IsString({ each: true })
  taskIds: string[];

  @ApiProperty({
    description: 'User ID to assign tasks to',
    example: '04a487df-f66a-4214-b32f-b46471103ec8',
  })
  @IsUUID(4, { message: 'Invalid user ID format' })
  assigneeId: string;

  @ApiProperty({
    description: 'Optional reason for the assignment',
    example: 'Reassigning tasks after team restructuring',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
