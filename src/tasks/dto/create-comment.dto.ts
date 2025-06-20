import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Comment content cannot exceed 1000 characters' })
  content: string;
}
