import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { TaskPriority } from '../enums/task-priority.enum';

export class UpdateTaskDto {
  @ApiProperty({
    description: 'Task title (2-255 characters)',
    example: 'Implement user authentication with JWT',
    minLength: 2,
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: 'Task description (max 5000 characters)',
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
    example: '2025-01-15T12:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
