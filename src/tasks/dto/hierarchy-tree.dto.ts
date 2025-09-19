import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TaskHierarchyDto } from './task-hierarchy.dto';

@Exclude()
export class HierarchyTreeDto {
  @Expose()
  @ApiProperty({
    description: 'All parent tasks (up to root)',
    type: () => [TaskHierarchyDto],
  })
  parents: TaskHierarchyDto[];

  @Expose()
  @ApiProperty({
    description: 'All child tasks (direct and nested)',
    type: () => [TaskHierarchyDto],
  })
  children: TaskHierarchyDto[];

  @Expose()
  @ApiProperty({
    description: 'Total count of parent relationships',
    example: 2,
  })
  parentCount: number;

  @Expose()
  @ApiProperty({
    description: 'Total count of child relationships',
    example: 5,
  })
  childCount: number;

  constructor(partial: Partial<HierarchyTreeDto>) {
    Object.assign(this, partial);
    this.parentCount = this.parents?.length || 0;
    this.childCount = this.children?.length || 0;
  }
}
