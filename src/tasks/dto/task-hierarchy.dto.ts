import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TaskResponseDto } from './task-response.dto';

@Exclude()
export class TaskHierarchyDto {
  @Expose()
  @ApiProperty({
    description: 'Hierarchy relationship unique identifier',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'ID of the project this hierarchy belongs to',
    example: 'b1c2d3e4-f5g6-7890-1234-567890abcdef',
  })
  projectId: string;

  @Expose()
  @ApiProperty({
    description: 'ID of the parent task',
    example: 'c1d2e3f4-g5h6-7890-1234-567890abcdef',
  })
  parentTaskId: string;

  @Expose()
  @Type(() => TaskResponseDto)
  @ApiProperty({
    description: 'Full details of the parent task',
    type: () => TaskResponseDto,
    required: false,
  })
  parentTask?: TaskResponseDto;

  @Expose()
  @ApiProperty({
    description: 'ID of the child task',
    example: 'd1e2f3g4-h5i6-7890-1234-567890abcdef',
  })
  childTaskId: string;

  @Expose()
  @Type(() => TaskResponseDto)
  @ApiProperty({
    description: 'Full details of the child task',
    type: () => TaskResponseDto,
    required: false,
  })
  childTask?: TaskResponseDto;

  @Expose()
  @ApiProperty({
    description: 'Hierarchy creation date',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  constructor(partial: Partial<TaskHierarchyDto>) {
    Object.assign(this, partial);
  }
}
