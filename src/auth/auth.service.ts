import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { I18nService } from 'nestjs-i18n';
import { JwtService } from '@nestjs/jwt';

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
    private readonly jwtService: JwtService,
  ) {}

  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private async generateTokens(payload: { email: string; id: string }) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ sub: payload.id, email: payload.email }),
      this.generateRefreshToken(payload.id),
    ]);
    return { accessToken, refreshToken };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const refreshToken = this.refreshTokenRepository.create({
      token,
      userId,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);
    return token;
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException({
        status: 409,
        code: 'AUTH.EMAIL_EXISTS',
        message: this.i18n.translate('auth.errors.email_exists'),
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
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException({
        status: 401,
        code: 'AUTH.INVALID_CREDENTIALS',
        message: this.i18n.translate('auth.errors.invalid_credentials'),
      });
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        status: 401,
        code: 'AUTH.INVALID_CREDENTIALS',
        message: this.i18n.translate('auth.errors.invalid_credentials'),
      });
    }

    // Check if email is confirmed
    if (!user.isEmailConfirmed) {
      throw new UnauthorizedException({
        status: 401,
        code: 'AUTH.EMAIL_NOT_CONFIRMED',
        message: this.i18n.translate('auth.errors.email_not_confirmed'),
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens({
      email: user.email,
      id: user.id,
    });

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
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
}
