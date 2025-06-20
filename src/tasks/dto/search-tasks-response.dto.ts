import { ApiProperty } from '@nestjs/swagger';
import { TaskResponseDto } from './task-response.dto';

export class SearchTasksResponseDto {
  @ApiProperty({
    description: 'Array of tasks matching the search criteria',
    type: [TaskResponseDto],
  })
  tasks: TaskResponseDto[];

  @ApiProperty({
    description: 'Total number of tasks matching the search criteria',
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
