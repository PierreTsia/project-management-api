import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { ProjectStatus } from '../entities/project.entity';
import { Project } from '../entities/project.entity';

@Exclude()
export class ProjectResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Project unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Project name',
    example: 'My Awesome Project',
  })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'Project description',
    example: 'This is a description of my awesome project',
    nullable: true,
  })
  description?: string;

  @Expose()
  @ApiProperty({
    description: 'Project status',
    enum: ProjectStatus,
    example: ProjectStatus.ACTIVE,
  })
  status: ProjectStatus;

  @Expose()
  @ApiProperty({
    description: 'Project owner ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  ownerId: string;

  @Expose()
  @ApiProperty({
    description: 'Project creation date',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Project last update date',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<Project>) {
    Object.assign(this, partial);
  }
}
