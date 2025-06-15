import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PASSWORD_REGEX } from '../constants';

export class UpdatePasswordDto {
  @ApiProperty({
    example: 'currentPassword123',
    description: 'The current password of the user',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'The new password of the user',
  })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message: i18nValidationMessage('validation.password_format'),
  })
  newPassword: string;
}
