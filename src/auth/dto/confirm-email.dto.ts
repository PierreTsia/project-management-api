import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmEmailDto {
  @ApiProperty({
    example: 'confirmation-token-123',
    description: 'The confirmation token received via email',
  })
  @IsString()
  token: string;
}
