import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ProjectRole } from '../projects/enums/project-role.enum';

export class ListContributorsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(ProjectRole)
  role?: ProjectRole;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  pageSize?: string;
}
