import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({
    example: 'currentPassword123',
    description: 'The current password of the user',
  })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'The new password of the user',
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
