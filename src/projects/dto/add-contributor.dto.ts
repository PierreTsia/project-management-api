import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ProjectRole } from '../enums/project-role.enum';

export class AddContributorDto {
  @ApiProperty({
    description: 'Email of the user to add as contributor',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: i18nValidationMessage('validation.invalid_email') })
  email: string;

  @ApiProperty({
    description: 'Role to assign to the contributor',
    enum: ProjectRole,
    example: ProjectRole.WRITE,
  })
  @IsEnum(ProjectRole, {
    message: i18nValidationMessage('validation.invalid_role'),
  })
  role: ProjectRole;
}
