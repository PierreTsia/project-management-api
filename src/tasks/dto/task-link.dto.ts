import { ApiProperty } from '@nestjs/swagger';
import { TASK_LINK_TYPES, TaskLinkType } from '../enums/task-link-type.enum';

export class TaskLinkDto {
  constructor(init?: Partial<TaskLinkDto>) {
    Object.assign(this, init);
  }

  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  projectId: string;

  @ApiProperty({ format: 'uuid' })
  sourceTaskId: string;

  @ApiProperty({ format: 'uuid' })
  targetTaskId: string;

  @ApiProperty({ enum: TASK_LINK_TYPES, enumName: 'TaskLinkType' })
  type: TaskLinkType;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
