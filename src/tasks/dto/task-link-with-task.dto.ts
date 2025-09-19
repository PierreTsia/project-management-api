import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { TaskLinkType } from '../enums/task-link-type.enum';
import { TaskResponseDto } from './task-response.dto';

@Expose()
export class TaskLinkWithTaskDto {
  @ApiProperty({
    description: 'Link unique identifier',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: 'Project ID',
    example: 'b1c2d3e4-f5g6-7890-1234-567890abcdef',
  })
  projectId: string;

  @ApiProperty({
    description: 'Source task ID',
    example: 'c1d2e3f4-g5h6-7890-1234-567890abcdef',
  })
  sourceTaskId: string;

  @ApiProperty({
    description: 'Target task ID',
    example: 'd1e2f3g4-h5i6-7890-1234-567890abcdef',
  })
  targetTaskId: string;

  @ApiProperty({
    description: 'Link type',
    enum: [
      'BLOCKS',
      'IS_BLOCKED_BY',
      'SPLITS_TO',
      'SPLITS_FROM',
      'RELATES_TO',
      'DUPLICATES',
      'IS_DUPLICATED_BY',
    ],
    example: 'BLOCKS',
  })
  type: TaskLinkType;

  @ApiProperty({
    description: 'Link creation date',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Source task details',
    type: TaskResponseDto,
  })
  @Type(() => TaskResponseDto)
  sourceTask?: TaskResponseDto;

  @ApiProperty({
    description: 'Target task details',
    type: TaskResponseDto,
  })
  @Type(() => TaskResponseDto)
  targetTask?: TaskResponseDto;

  constructor(partial: Partial<TaskLinkWithTaskDto>) {
    Object.assign(this, partial);
  }
}
