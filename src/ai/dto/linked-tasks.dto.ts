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

export enum TaskLinkType {
  BLOCKS = 'BLOCKS',
  IS_BLOCKED_BY = 'IS_BLOCKED_BY',
  DUPLICATES = 'DUPLICATES',
  IS_DUPLICATED_BY = 'IS_DUPLICATED_BY',
  SPLITS_TO = 'SPLITS_TO',
  SPLITS_FROM = 'SPLITS_FROM',
  RELATES_TO = 'RELATES_TO',
}

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
}

export class TaskRelationshipPreviewDto {
  @ApiProperty({ description: 'Placeholder for source task, e.g., task_1' })
  @IsString()
  sourceTask: string;

  @ApiProperty({ description: 'Placeholder for target task, e.g., task_2' })
  @IsString()
  targetTask: string;

  @ApiProperty({ enum: TaskLinkType })
  @IsEnum(TaskLinkType)
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

  @ApiProperty({ enum: TaskLinkType })
  @IsEnum(TaskLinkType)
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

  @ApiProperty({ enum: TaskLinkType })
  @IsEnum(TaskLinkType)
  type: TaskLinkType;

  @ApiProperty({ enum: RejectedReasonCode })
  @IsEnum(RejectedReasonCode)
  reasonCode: RejectedReasonCode;

  @ApiProperty({ description: 'Human-readable reason' })
  @IsString()
  reasonMessage: string;
}
