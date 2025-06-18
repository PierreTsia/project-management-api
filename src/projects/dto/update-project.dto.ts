import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ProjectStatus } from '../entities/project.entity';

export class UpdateProjectDto {
  @ApiProperty({
    description: 'Project name (2-100 characters)',
    example: 'My Updated Project',
    required: false,
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, {
    message: i18nValidationMessage('validation.name_too_short'),
  })
  @MaxLength(100, {
    message: i18nValidationMessage('validation.name_too_long'),
  })
  name?: string;

  @ApiProperty({
    description: 'Project description (optional, max 1000 characters)',
    example: 'This is an updated description of my project',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: i18nValidationMessage('validation.description_too_long'),
  })
  description?: string;

  @ApiProperty({
    description: 'Project status',
    enum: ProjectStatus,
    example: ProjectStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus, {
    message: i18nValidationMessage('validation.invalid_status'),
  })
  status?: ProjectStatus;
}
