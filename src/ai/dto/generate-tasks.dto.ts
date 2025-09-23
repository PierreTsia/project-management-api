import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export class GenerateTasksRequestDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  locale?: string;
}

export class GeneratedTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority?: Priority;
}

export class GenerateTasksResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneratedTaskDto)
  @Min(3, { message: 'Must generate at least 3 tasks' })
  @Max(12, { message: 'Must generate at most 12 tasks' })
  tasks: ReadonlyArray<GeneratedTaskDto>;

  meta: {
    model: string;
    provider: string;
    tokensEstimated?: number;
    degraded: boolean;
  };
}
