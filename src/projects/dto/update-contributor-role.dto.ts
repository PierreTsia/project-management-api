import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ProjectRole } from '../enums/project-role.enum';

export class UpdateContributorRoleDto {
  @ApiProperty({
    description: 'New role to assign to the contributor',
    enum: ProjectRole,
    example: ProjectRole.ADMIN,
  })
  @IsEnum(ProjectRole, {
    message: i18nValidationMessage('validation.invalid_role'),
  })
  role: ProjectRole;
}
