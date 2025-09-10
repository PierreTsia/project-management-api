import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from '../../projects/entities/project.entity';

export class DashboardProjectDto {
  @ApiProperty({
    description: 'Unique project identifier',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  id: string;

  @ApiProperty({
    description: 'Project name',
    example: 'Project Alpha',
  })
  name: string;

  @ApiProperty({
    description: 'Project description',
    example: 'Main project for developing the new dashboard feature',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Project status',
    enum: ProjectStatus,
    example: ProjectStatus.ACTIVE,
  })
  status: ProjectStatus;

  @ApiProperty({
    description: 'Project owner information',
    type: 'object',
    properties: {
      id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440002' },
      name: { type: 'string', example: 'John Doe' },
    },
  })
  owner: {
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'User role in this project',
    example: 'ADMIN',
  })
  userRole: string;

  @ApiProperty({
    description: 'Number of tasks in this project',
    example: 15,
  })
  taskCount: number;

  @ApiProperty({
    description: 'Number of tasks assigned to the current user in this project',
    example: 5,
  })
  assignedTaskCount: number;

  @ApiProperty({
    description: 'Project creation timestamp',
    example: '2024-01-01T09:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Project last update timestamp',
    example: '2024-01-15T14:30:00Z',
  })
  updatedAt: Date;
}
