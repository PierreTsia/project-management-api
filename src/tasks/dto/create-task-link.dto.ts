import { IsUUID, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TASK_LINK_TYPES, TaskLinkType } from '../enums/task-link-type.enum';

export class CreateTaskLinkDto {
  @ApiProperty({
    description: 'Project identifier',
    format: 'uuid',
    example: '8b7a1e03-3b8b-4a9e-948c-6a0d6a6f2b9d',
  })
  @IsUUID()
  projectId: string;

  @ApiProperty({
    description: 'Source task identifier',
    format: 'uuid',
    example: '5e898eca-eb8c-4802-b5d2-eade92672023',
  })
  @IsUUID()
  sourceTaskId: string;

  @ApiProperty({
    description: 'Target task identifier',
    format: 'uuid',
    example: '36640742-640f-49a9-add9-4a9bc7433c81',
  })
  @IsUUID()
  targetTaskId: string;

  @ApiProperty({
    description: 'Relationship type',
    enum: TASK_LINK_TYPES,
    enumName: 'TaskLinkType',
    example: 'BLOCKS',
  })
  @IsIn(TASK_LINK_TYPES as readonly string[])
  type: TaskLinkType;
}
