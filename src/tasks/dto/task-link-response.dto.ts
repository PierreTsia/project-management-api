import { ApiProperty } from '@nestjs/swagger';
import { TaskLinkDto } from './task-link.dto';

export class TaskLinkResponseDto {
  constructor(init?: Partial<TaskLinkResponseDto>) {
    Object.assign(this, init);
  }

  @ApiProperty({ type: [TaskLinkDto] })
  links: TaskLinkDto[];

  @ApiProperty({ example: 1 })
  total: number;
}
