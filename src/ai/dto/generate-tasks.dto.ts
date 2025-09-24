import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export class GenerateTasksRequestDto {
  @ApiProperty({
    description: 'User intent or requirement for task generation',
    example: 'Create a user authentication system',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'Optional project ID to provide context for task generation',
    example: '71063ace-7803-43d3-a95b-9d26ef1c129b',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Locale for task generation (currently only en is supported)',
    example: 'en',
    default: 'en',
    required: false,
  })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiProperty({
    description:
      'Optional generation options that influence output (e.g., taskCount, minPriority)',
    required: false,
    example: { taskCount: 6, minPriority: 'MEDIUM' },
  })
  @IsOptional()
  options?: Record<string, string | number | boolean>;
}

export class GeneratedTaskDto {
  @ApiProperty({
    description: 'Task title (required)',
    example: 'Design authentication UI components',
    minLength: 1,
    maxLength: 80,
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Optional task description',
    example: 'Create login and registration forms with validation',
    maxLength: 240,
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Task priority level',
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    example: 'HIGH',
    required: false,
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority?: Priority;
}

export class GenerateTasksResponseDto {
  @ApiProperty({
    description: 'Array of generated tasks (3-12 tasks)',
    type: [GeneratedTaskDto],
    minItems: 3,
    maxItems: 12,
    example: [
      {
        title: 'Design authentication UI components',
        description: 'Create login and registration forms with validation',
        priority: 'HIGH',
      },
      {
        title: 'Implement JWT token management',
        description: 'Set up secure token generation and validation',
        priority: 'HIGH',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedTaskDto)
  @ArrayMinSize(3, { message: 'Must generate at least 3 tasks' })
  @ArrayMaxSize(12, { message: 'Must generate at most 12 tasks' })
  tasks: ReadonlyArray<GeneratedTaskDto>;

  @ApiProperty({
    description: 'Response metadata',
    example: {
      model: 'mistral-small-latest',
      provider: 'mistral',
      degraded: false,
    },
  })
  meta: {
    model: string;
    provider: string;
    tokensEstimated?: number | null;
    usageMetadata?: any;
    degraded: boolean;
    locale?: string;
    options?: Record<string, string | number | boolean>;
  };
}
