import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name (2-100 characters)',
    example: 'My Awesome Project',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, {
    message: i18nValidationMessage('validation.name_too_short'),
  })
  @MaxLength(100, {
    message: i18nValidationMessage('validation.name_too_long'),
  })
  name: string;

  @ApiProperty({
    description: 'Project description (optional, max 1000 characters)',
    example: 'This is a description of my awesome project',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: i18nValidationMessage('validation.description_too_long'),
  })
  description?: string;
}
