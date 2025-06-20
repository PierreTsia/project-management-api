import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Comment content cannot exceed 1000 characters' })
  content?: string;
}
