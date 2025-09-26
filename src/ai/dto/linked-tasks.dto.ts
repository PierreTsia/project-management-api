import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { GeneratedTaskDto } from './generate-tasks.dto';
import {
  TASK_LINK_TYPES,
  TaskLinkType,
} from '../../tasks/enums/task-link-type.enum';

export class GenerateLinkedTasksRequestDto {
  @ApiProperty({ description: 'User intent for generating linked tasks' })
  @IsString()
  prompt: string;

  @ApiProperty({ description: 'Project context', format: 'uuid' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({ description: 'Enable relationship generation' })
  @IsOptional()
  @IsBoolean()
  generateRelationships?: boolean;

  @ApiProperty({
    description:
      'Optional generation options that influence output (e.g., taskCount, minPriority)',
    required: false,
    example: { taskCount: 6, minPriority: 'MEDIUM' },
  })
  @IsOptional()
  options?: Record<string, string | number | boolean>;
}

export class TaskRelationshipPreviewDto {
  @ApiProperty({ description: 'Placeholder for source task, e.g., task_1' })
  @IsString()
  sourceTask: string;

  @ApiProperty({ description: 'Placeholder for target task, e.g., task_2' })
  @IsString()
  targetTask: string;

  @ApiProperty({ enum: TASK_LINK_TYPES })
  @IsEnum(TASK_LINK_TYPES)
  type: TaskLinkType;
}

export class GenerateLinkedTasksPreviewDto {
  @ApiProperty({ type: [GeneratedTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedTaskDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  tasks: ReadonlyArray<GeneratedTaskDto>;

  @ApiPropertyOptional({ type: [TaskRelationshipPreviewDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskRelationshipPreviewDto)
  relationships?: ReadonlyArray<TaskRelationshipPreviewDto>;

  @ApiProperty({ description: 'Preview metadata' })
  @IsObject()
  meta: {
    placeholderMode: boolean;
    resolutionInstructions: string;
  };
}

export class ConfirmLinkedTasksDto {
  @ApiProperty({ type: [GeneratedTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedTaskDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  tasks: ReadonlyArray<GeneratedTaskDto>;

  @ApiPropertyOptional({ type: [TaskRelationshipPreviewDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskRelationshipPreviewDto)
  relationships?: ReadonlyArray<TaskRelationshipPreviewDto>;

  @ApiProperty({ description: 'Project ID', format: 'uuid' })
  @IsString()
  projectId: string;
}

export class TaskRelationshipDto {
  @ApiProperty({ description: 'Source task ID', format: 'uuid' })
  @IsString()
  sourceTaskId: string;

  @ApiProperty({ description: 'Target task ID', format: 'uuid' })
  @IsString()
  targetTaskId: string;

  @ApiProperty({ enum: TASK_LINK_TYPES })
  @IsEnum(TASK_LINK_TYPES)
  type: TaskLinkType;

  @ApiProperty({ description: 'Project ID', format: 'uuid' })
  @IsString()
  projectId: string;
}

export class GenerateLinkedTasksResponseDto {
  @ApiProperty({ type: [GeneratedTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedTaskDto)
  tasks: ReadonlyArray<GeneratedTaskDto>;

  @ApiPropertyOptional({ type: [TaskRelationshipDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskRelationshipDto)
  relationships?: ReadonlyArray<TaskRelationshipDto>;

  @ApiPropertyOptional({
    description:
      'Rejected relationships with reasons (validation errors, duplicates, etc.)',
    type: 'array',
  })
  @IsOptional()
  @IsArray()
  rejectedRelationships?: ReadonlyArray<RejectedRelationshipDto>;

  @ApiPropertyOptional({ description: 'Total links attempted' })
  @IsOptional()
  totalLinks?: number;

  @ApiPropertyOptional({ description: 'Number of links created successfully' })
  @IsOptional()
  createdLinks?: number;

  @ApiPropertyOptional({
    description: 'Number of links rejected by validation',
  })
  @IsOptional()
  rejectedLinks?: number;
}

export enum RejectedReasonCode {
  INVALID = 'INVALID',
  CIRCULAR = 'CIRCULAR',
  CROSS_PROJECT = 'CROSS_PROJECT',
  DUPLICATE = 'DUPLICATE',
  UNKNOWN = 'UNKNOWN',
}

export class RejectedRelationshipDto {
  @ApiProperty({ description: 'Attempted source task ID', format: 'uuid' })
  @IsString()
  sourceTaskId: string;

  @ApiProperty({ description: 'Attempted target task ID', format: 'uuid' })
  @IsString()
  targetTaskId: string;

  @ApiProperty({ enum: TASK_LINK_TYPES })
  @IsEnum(TASK_LINK_TYPES)
  type: TaskLinkType;

  @ApiProperty({ enum: RejectedReasonCode })
  @IsEnum(RejectedReasonCode)
  reasonCode: RejectedReasonCode;

  @ApiProperty({ description: 'Human-readable reason' })
  @IsString()
  reasonMessage: string;
}
