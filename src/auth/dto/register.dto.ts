import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email of the user',
  })
  @IsEmail({}, { message: i18nValidationMessage('validation.invalid_email') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.required_field') })
  email: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd',
    description:
      'The password must contain at least 8 characters, one uppercase letter, one number, and one special character',
  })
  @IsString()
  @MinLength(8, {
    message: i18nValidationMessage('validation.password_too_short'),
  })
  @IsNotEmpty({ message: i18nValidationMessage('validation.required_field') })
  @Matches(PASSWORD_REGEX, {
    message: i18nValidationMessage('validation.password_format'),
  })
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'The name of the user',
  })
  @IsString()
  @IsNotEmpty({ message: i18nValidationMessage('validation.required_field') })
  @MinLength(6, { message: i18nValidationMessage('validation.name_too_short') })
  name: string;
}
