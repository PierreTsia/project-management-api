import { ApiProperty } from '@nestjs/swagger';
import { TaskResponseDto } from './task-response.dto';

export class GlobalSearchTasksResponseDto {
  @ApiProperty({
    description: 'Array of tasks matching the search criteria',
    type: [TaskResponseDto],
  })
  tasks: TaskResponseDto[];

  @ApiProperty({
    description: 'Total number of tasks matching the search criteria',
    example: 150,
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

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there are more pages available',
    example: true,
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there are previous pages available',
    example: false,
  })
  hasPreviousPage: boolean;
}
