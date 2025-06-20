import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'The updated content of the comment',
    example: 'Updated comment with more details.',
    maxLength: 1000,
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Comment content cannot exceed 1000 characters' })
  content?: string;
}
