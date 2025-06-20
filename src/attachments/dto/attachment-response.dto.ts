import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { AttachmentEntityType } from '../entities/attachment.entity';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class AttachmentResponseDto {
  @ApiProperty({
    description: 'Attachment unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'document.pdf',
  })
  @Expose()
  filename: string;

  @ApiProperty({
    description: 'File MIME type',
    example: 'application/pdf',
  })
  @Expose()
  fileType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  @Expose()
  fileSize: number;

  @ApiProperty({
    description: 'Cloudinary URL for the file',
    example: 'https://res.cloudinary.com/example/image/upload/v123/file.pdf',
  })
  @Expose()
  cloudinaryUrl: string;

  @ApiProperty({
    description: 'Entity type (PROJECT or TASK)',
    enum: AttachmentEntityType,
    example: AttachmentEntityType.TASK,
  })
  @Expose()
  entityType: AttachmentEntityType;

  @ApiProperty({
    description: 'Entity ID (Project ID or Task ID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  entityId: string;

  @ApiProperty({
    description: 'When the file was uploaded',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  uploadedAt: Date;

  @ApiProperty({
    description: 'When the file was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    description: 'User who uploaded the file',
    type: UserResponseDto,
  })
  @Expose()
  @Type(() => UserResponseDto)
  uploadedBy: UserResponseDto;

  @Exclude()
  cloudinaryPublicId?: string;

  @Exclude()
  uploadedById?: string;

  constructor(partial: Partial<AttachmentResponseDto>) {
    Object.assign(this, partial);
  }
}
