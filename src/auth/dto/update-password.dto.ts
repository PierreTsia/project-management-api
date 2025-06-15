import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePasswordDto {
  @ApiProperty({
    example: 'currentpassword123',
    description: 'The current password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @ApiProperty({
    example: 'newpassword123',
    description: 'The new password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
