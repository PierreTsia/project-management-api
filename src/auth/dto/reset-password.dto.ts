import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-123',
    description: 'The reset token received via email',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'newPassword123',
    description: 'The new password for the user',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
