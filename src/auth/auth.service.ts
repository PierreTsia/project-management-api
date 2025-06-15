import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { I18nService } from 'nestjs-i18n';

import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly i18n: I18nService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'AUTH.EMAIL_EXISTS',
        message: this.i18n.translate('auth.email_exists'),
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate confirmation token
    const confirmationToken = uuidv4();

    // Create new user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      isEmailConfirmed: false,
      emailConfirmationToken: confirmationToken,
    });

    await this.userRepository.save(user);

    // TODO: Send confirmation email
    // For now, just return the token
    return {
      message: this.i18n.translate('auth.messages.registration_success'),
      confirmationToken,
    };
  }

  async login(loginDto: LoginDto) {
    // TODO: Implement login
    return { message: 'Login not implemented yet' };
  }

  async refreshTokens(refreshToken: string) {
    // TODO: Implement token refresh
    return { message: 'Token refresh not implemented yet' };
  }

  async logout(refreshToken: string) {
    // TODO: Implement logout
    return { message: 'Logout not implemented yet' };
  }

  async confirmEmail(token: string) {
    // TODO: Implement email confirmation
    return { message: 'Email confirmation not implemented yet' };
  }

  async forgotPassword(email: string) {
    // TODO: Implement forgot password
    return { message: 'Forgot password not implemented yet' };
  }

  async resetPassword(token: string, password: string) {
    // TODO: Implement password reset
    return { message: 'Password reset not implemented yet' };
  }

  async resendConfirmation(email: string) {
    // TODO: Implement resend confirmation
    return { message: 'Resend confirmation not implemented yet' };
  }

  async updatePassword(
    email: string,
    updatePasswordDto: UpdatePasswordDto,
    acceptLanguage?: string,
  ) {
    // TODO: Implement password update
    return { message: 'Password update not implemented yet' };
  }

  async generateTokens(payload: { email: string; id: string }) {
    // TODO: Implement token generation
    return { message: 'Token generation not implemented yet' };
  }
}
