import {
  Controller,
  Get,
  Request,
  Headers,
  UseInterceptors,
  ClassSerializerInterceptor,
  Post,
  UploadedFile,
  Body,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '../config/multer.config';
import { UpdateNameDto } from './dto/update-name.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current user profile',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @Get('whoami')
  async whoami(
    @Request() req: { user: User },
    @Headers('accept-language') _acceptLanguage?: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(req.user.id);
    return new UserResponseDto(user);
  }

  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
  })
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadAvatar(
    @Request() req: { user: User },
    @Headers('accept-language') acceptLanguage: string,
    @UploadedFile() file: any,
  ): Promise<Partial<User>> {
    return this.usersService.uploadAvatar(req.user.id, file, acceptLanguage);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user name' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated',
    type: User,
  })
  async updateName(
    @Request() req: { user: User },
    @Body() updateNameDto: UpdateNameDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.usersService.updateName(
      req.user.id,
      updateNameDto,
      acceptLanguage,
    );
  }
}
