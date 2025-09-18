import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '../projects/enums/project-role.enum';

export class ApiUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false, nullable: true })
  avatarUrl?: string | null;
}

export class ApiProjectPreviewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ProjectRole })
  role!: ProjectRole;
}

export class ApiContributorAggregateDto {
  @ApiProperty({ type: ApiUserDto })
  user!: ApiUserDto;

  @ApiProperty()
  projectsCount!: number;

  @ApiProperty({ type: ApiProjectPreviewDto, isArray: true })
  projectsPreview!: ApiProjectPreviewDto[];

  @ApiProperty({ enum: ProjectRole, isArray: true })
  roles!: ProjectRole[];
}

export class ApiContributorsListDto {
  @ApiProperty({ type: ApiContributorAggregateDto, isArray: true })
  contributors!: ApiContributorAggregateDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class ApiContributorProjectsDto {
  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ProjectRole })
  role!: ProjectRole;
}
