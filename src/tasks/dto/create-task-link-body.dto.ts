import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { TaskLinkType, TASK_LINK_TYPES } from '../enums/task-link-type.enum';

export class CreateTaskLinkBodyDto {
  @ApiProperty({ description: 'Target task id', format: 'uuid' })
  @IsUUID()
  targetTaskId!: string;

  @ApiProperty({ description: 'Link type', enum: TASK_LINK_TYPES })
  @IsEnum(TASK_LINK_TYPES)
  type!: TaskLinkType;
}
