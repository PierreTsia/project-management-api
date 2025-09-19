import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateTaskHierarchyDto {
  @IsUUID()
  @ApiProperty({
    description: 'ID of the project',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  projectId: string;

  @IsUUID()
  @ApiProperty({
    description: 'ID of the parent task',
    example: 'b1c2d3e4-f5g6-7890-1234-567890abcdef',
  })
  parentTaskId: string;

  @IsUUID()
  @ApiProperty({
    description: 'ID of the child task',
    example: 'c1d2e3f4-g5h6-7890-1234-567890abcdef',
  })
  childTaskId: string;
}
