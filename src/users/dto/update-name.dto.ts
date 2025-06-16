import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateNameDto {
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
}
