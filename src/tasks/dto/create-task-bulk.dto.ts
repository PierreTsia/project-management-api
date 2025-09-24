import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

export class CreateTaskBulkDto {
  @ApiProperty({
    description: 'Tasks to create in bulk',
    type: [CreateTaskDto],
    minItems: 1,
    maxItems: 25,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => CreateTaskDto)
  items: CreateTaskDto[];
}
