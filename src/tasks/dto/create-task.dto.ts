import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { TaskPriority } from '../enums/task-priority.enum';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Task title (2-255 characters)',
    example: 'Implement user authentication',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Task description (optional, max 5000 characters)',
    example: 'Use JWT for authentication and Passport.js for strategy.',
    required: false,
    maxLength: 5000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({
    description: 'Task priority',
    example: TaskPriority.HIGH,
    enum: TaskPriority,
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({
    description: 'Task due date (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({
    description: 'ID of the user this task is assigned to',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
