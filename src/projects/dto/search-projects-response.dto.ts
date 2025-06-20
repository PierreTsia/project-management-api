import { ApiProperty } from '@nestjs/swagger';
import { ProjectResponseDto } from './project-response.dto';

export class SearchProjectsResponseDto {
  @ApiProperty({
    description: 'Array of projects matching the search criteria',
    type: [ProjectResponseDto],
  })
  projects: ProjectResponseDto[];

  @ApiProperty({
    description: 'Total number of projects matching the search criteria',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;
}
