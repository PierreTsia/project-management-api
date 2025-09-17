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
  Param,
  NotFoundException,
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
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { I18nService } from 'nestjs-i18n';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly i18n: I18nService,
  ) {}

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

  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user details',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @Get(':id')
  async getUserById(
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException({
        status: 404,
        code: 'USER.NOT_FOUND',
        message: this.i18n.translate('errors.user.not_found', {
          lang: acceptLanguage,
        }),
      });
    }
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
    try {
      const result = await this.usersService.uploadAvatar(
        req.user.id,
        file,
        acceptLanguage,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile (name, bio, phone, dob)' })
  @ApiResponse({
    status: 200,
    description: 'User profile updated',
    type: User,
  })
  async updateProfile(
    @Request() req: { user: User },
    @Body() body: UpdateUserProfileDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    return this.usersService.updateProfile(req.user.id, body, acceptLanguage);
  }
}
