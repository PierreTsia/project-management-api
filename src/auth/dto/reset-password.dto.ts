import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'newpassword123',
    description: 'The new password',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'reset-token-123',
    description: 'The reset token received via email',
  })
  @IsString()
  token: string;
}
