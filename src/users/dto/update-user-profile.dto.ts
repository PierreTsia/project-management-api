import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsISO8601,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateUserProfileDto {
  @ApiProperty({
    description:
      'User full name (2-50 characters, letters, numbers, spaces and hyphens only)',
    example: 'John Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, {
    message: i18nValidationMessage('validation.name_too_short'),
  })
  @MaxLength(50, {
    message: i18nValidationMessage('validation.name_too_long'),
  })
  @Matches(/^[a-zA-Z0-9\s-]+$/, {
    message: i18nValidationMessage('validation.name_format'),
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Short biography about the user',
    example: 'Product manager and amateur climber.',
    maxLength: 280,
  })
  @IsOptional()
  @IsString()
  @MaxLength(280, {
    message: i18nValidationMessage('validation.bio_too_long'),
  })
  bio?: string;

  @ApiPropertyOptional({
    description: 'Phone number in E.164 format',
    example: '+15551234567',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/u, {
    message: i18nValidationMessage('validation.phone_format'),
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Date of birth as ISO 8601 date string (YYYY-MM-DD)',
    example: '1990-05-20',
  })
  @IsOptional()
  @IsISO8601({}, { message: i18nValidationMessage('validation.dob_format') })
  dob?: string;
}
