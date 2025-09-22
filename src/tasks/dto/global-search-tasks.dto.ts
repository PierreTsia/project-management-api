import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ArrayMaxSize, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';

export class GlobalSearchTasksDto {
  @ApiProperty({
    description:
      'Search query for task title and description (case-insensitive)',
    example: 'bug fix',
    required: false,
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({
    description: 'Filter by task status',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    description: 'Filter by task priority',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({
    description: 'Filter by assignee ID',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiProperty({
    description:
      'Filter by a list of project IDs. If omitted or empty, search across ALL accessible projects.',
    example: ['a1b2c3d4-e5f6-7890-1234-567890abcdef'],
    required: false,
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.length > 0) return value.split(',');
    return undefined;
  })
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  projectIds?: string[];

  @ApiProperty({
    description: 'Filter tasks due after this date (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiProperty({
    description: 'Filter tasks due before this date (YYYY-MM-DD)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiProperty({
    description: 'Filter tasks created after this date (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiProperty({
    description: 'Filter tasks created before this date (YYYY-MM-DD)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiProperty({
    description: 'Field to sort by',
    enum: ['createdAt', 'dueDate', 'priority', 'status', 'title'],
    example: 'dueDate',
    required: false,
  })
  @IsOptional()
  @IsEnum(['createdAt', 'dueDate', 'priority', 'status', 'title'])
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title';

  @ApiProperty({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    example: 'ASC',
    required: false,
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiProperty({
    description: 'Filter by assignee type',
    enum: ['me', 'unassigned', 'any'],
    example: 'me',
    required: false,
  })
  @IsOptional()
  @IsEnum(['me', 'unassigned', 'any'])
  assigneeFilter?: 'me' | 'unassigned' | 'any';

  @ApiProperty({
    description: 'Filter for overdue tasks only',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isOverdue?: boolean;

  @ApiProperty({
    description: 'Filter for tasks with due dates only',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasDueDate?: boolean;

  @ApiProperty({
    description: 'Include tasks from archived projects',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeArchived?: boolean;

  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
