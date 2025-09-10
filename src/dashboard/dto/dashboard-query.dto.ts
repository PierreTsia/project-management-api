import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TaskStatus } from '../../tasks/enums/task-status.enum';
import { TaskPriority } from '../../tasks/enums/task-priority.enum';

export class DashboardQueryDto {
  @ApiProperty({
    description: 'Filter tasks by status',
    enum: TaskStatus,
    required: false,
    example: TaskStatus.TODO,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    description: 'Filter tasks by priority',
    enum: TaskPriority,
    required: false,
    example: TaskPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({
    description: 'Filter tasks by specific project ID',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Filter tasks due after this date (YYYY-MM-DD)',
    required: false,
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiProperty({
    description: 'Filter tasks due before this date (YYYY-MM-DD)',
    required: false,
    example: '2024-01-31',
  })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
