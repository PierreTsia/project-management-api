import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '../projects/enums/project-role.enum';

export class SwaggerUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty({ required: false, nullable: true })
  avatarUrl?: string | null;
}

export class SwaggerProjectPreviewDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ProjectRole })
  role!: ProjectRole;
}

export class SwaggerContributorAggregateDto {
  @ApiProperty({ type: SwaggerUserDto })
  user!: SwaggerUserDto;

  @ApiProperty()
  projectsCount!: number;

  @ApiProperty({ type: SwaggerProjectPreviewDto, isArray: true })
  projectsPreview!: SwaggerProjectPreviewDto[];

  @ApiProperty({ enum: ProjectRole, isArray: true })
  roles!: ProjectRole[];
}

export class SwaggerContributorsListDto {
  @ApiProperty({ type: SwaggerContributorAggregateDto, isArray: true })
  contributors!: SwaggerContributorAggregateDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class SwaggerContributorProjectsDto {
  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ProjectRole })
  role!: ProjectRole;
}
