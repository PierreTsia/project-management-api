import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { User } from '../entities/user.entity';

@Exclude()
export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'User bio',
    example: 'Software developer passionate about clean code',
    required: false,
  })
  @Expose()
  bio: string | null;

  @ApiProperty({
    description: 'User date of birth',
    example: '1990-01-01',
    required: false,
  })
  @Expose()
  dob: Date | null;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  @Expose()
  phone: string | null;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://api.dicebear.com/7.x/identicon/svg?seed=default',
  })
  @Expose()
  avatarUrl: string;

  @ApiProperty({
    description: 'Whether email is confirmed',
    example: true,
  })
  @Expose()
  isEmailConfirmed: boolean;

  @ApiProperty({
    description: 'When the user was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'When the user was last updated',
    example: '2024-01-15T10:30:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
