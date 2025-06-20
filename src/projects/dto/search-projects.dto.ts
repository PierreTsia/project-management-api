import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ProjectStatus } from '../entities/project.entity';

export class SearchProjectsDto {
  @ApiProperty({
    description:
      'Search query for project name and description (case-insensitive)',
    example: 'mobile app',
    required: false,
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({
    description: 'Filter by project status',
    enum: ProjectStatus,
    example: ProjectStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
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
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
