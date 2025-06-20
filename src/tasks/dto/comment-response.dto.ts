import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Comment } from '../entities/comment.entity';

@Exclude()
export class CommentResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Comment unique identifier',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'Comment content',
    example: 'This task needs more details about the requirements.',
  })
  content: string;

  @Expose()
  @ApiProperty({
    description: 'ID of the task this comment belongs to',
    example: 'b1c2d3e4-f5g6-7890-1234-567890abcdef',
  })
  taskId: string;

  @Expose()
  @ApiProperty({
    description: 'ID of the user who created this comment',
    example: 'c1d2e3f4-g5h6-7890-1234-567890abcdef',
  })
  userId: string;

  @Expose()
  @ApiProperty({
    description: 'Comment creation date',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Comment last update date',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;

  @Expose()
  @ApiProperty({
    description: 'User who created the comment',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'c1d2e3f4-g5h6-7890-1234-567890abcdef' },
      name: { type: 'string', example: 'John Doe' },
      email: { type: 'string', example: 'john.doe@example.com' },
    },
    nullable: true,
  })
  user?: {
    id: string;
    name: string;
    email: string;
  };

  constructor(partial: Partial<Comment>) {
    Object.assign(this, partial);
  }
}
