import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { ProjectRole } from '../enums/project-role.enum';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class ContributorResponseDto {
  @ApiProperty({
    description: 'Contributor unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'User ID of the contributor',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  userId: string;

  @ApiProperty({
    description: 'Contributor role in the project',
    enum: ProjectRole,
    example: ProjectRole.WRITE,
  })
  @Expose()
  role: ProjectRole;

  @ApiProperty({
    description: 'When the contributor joined the project',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  joinedAt: Date;

  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
  })
  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;

  @Exclude()
  projectId?: string;

  constructor(partial: Partial<ContributorResponseDto>) {
    Object.assign(this, partial);
  }
}
