import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { I18nService } from 'nestjs-i18n';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { RefreshTokenService } from './refresh-token.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { REFRESH_TOKEN_EXPIRATION_TIME } from './constants';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { ResendConfirmationDto } from './dto/resend-confirmation.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly i18n: I18nService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
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
    const expiresIn = REFRESH_TOKEN_EXPIRATION_TIME; // 7 days in seconds
    await this.refreshTokenService.createRefreshToken(userId, token, expiresIn);
    return token;
  }

  async register(registerDto: RegisterDto, acceptLanguage?: string) {
    const { email, password, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException({
        status: 409,
        code: 'AUTH.EMAIL_EXISTS',
        message: this.i18n.translate('auth.errors.email_exists', {
          lang: acceptLanguage,
        }),
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate confirmation token
    const confirmationToken = uuidv4();

    // Create new user
    await this.usersService.create({
      email,
      password: hashedPassword,
      name,
      isEmailConfirmed: false,
      emailConfirmationToken: confirmationToken,
    });

    // Send confirmation email
    await this.emailService.sendEmailConfirmation(
      email,
      confirmationToken,
      acceptLanguage,
    );

    return {
      message: this.i18n.translate('auth.messages.registration_success', {
        lang: acceptLanguage,
      }),
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.usersService.findByEmail(email);

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

  async refreshTokens(refreshToken: string, acceptLanguage?: string) {
    // Strip 'Bearer ' prefix if present
    const cleanToken = refreshToken.replace(/^Bearer\s+/i, '');

    const payload =
      await this.refreshTokenService.validateRefreshToken(cleanToken);
    if (!payload) {
      throw new UnauthorizedException({
        status: 401,
        code: 'AUTH.INVALID_REFRESH_TOKEN',
        message: this.i18n.translate('auth.errors.invalid_refresh_token', {
          lang: acceptLanguage,
        }),
      });
    }

    const user = await this.usersService.findOne(payload.user.id);
    if (!user) {
      throw new UnauthorizedException({
        status: 401,
        code: 'AUTH.USER_NOT_FOUND',
        message: this.i18n.translate('auth.errors.user_not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokens({
        email: user.email,
        id: user.id,
      });

    // Revoke the old refresh token
    await this.refreshTokenService.revokeRefreshToken(cleanToken);

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    await this.refreshTokenService.revokeRefreshToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  async confirmEmail({ token }: ConfirmEmailDto) {
    const user = await this.usersService.findByEmailConfirmationToken(token);
    if (!user) {
      throw new NotFoundException('Invalid confirmation token');
    }

    const currentDate = new Date();
    if (
      user.emailConfirmationExpires &&
      user.emailConfirmationExpires < currentDate
    ) {
      throw new UnauthorizedException('Confirmation token has expired');
    }

    await this.usersService.update(user.id, {
      isEmailConfirmed: true,
      emailConfirmationToken: null,
      emailConfirmationExpires: null,
    });

    return { message: 'Email confirmed successfully' };
  }

  async forgotPassword(_email: string) {
    // TODO: Implement forgot password
    return { message: 'Forgot password not implemented yet' };
  }

  async resetPassword(_token: string, _password: string) {
    // TODO: Implement password reset
    return { message: 'Password reset not implemented yet' };
  }

  async resendConfirmation({ email }: ResendConfirmationDto) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists or not
      return {
        message:
          'If your email is registered, you will receive a new confirmation link',
      };
    }

    if (user.isEmailConfirmed) {
      throw new ConflictException('Email is already confirmed');
    }

    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationExpires = new Date();
    confirmationExpires.setDate(confirmationExpires.getDate() + 7); // 7 days from now

    await this.usersService.update(user.id, {
      emailConfirmationToken: confirmationToken,
      emailConfirmationExpires: confirmationExpires,
    });

    await this.emailService.sendEmailConfirmation(email, confirmationToken);

    return {
      message:
        'If your email is registered, you will receive a new confirmation link',
    };
  }

  async updatePassword(
    email: string,
    updatePasswordDto: UpdatePasswordDto,
    acceptLanguage?: string,
  ) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH.USER_NOT_FOUND',
        message: this.i18n.translate('errors.auth.user_not_found', {
          lang: acceptLanguage,
        }),
      });
    }

    const isPasswordValid = user.password
      ? await bcrypt.compare(updatePasswordDto.currentPassword, user.password)
      : false;

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'AUTH.INVALID_CREDENTIALS',
        message: this.i18n.translate('auth.errors.invalid_credentials', {
          lang: acceptLanguage,
        }),
      });
    }

    // Check if new password is different from current password
    if (updatePasswordDto.newPassword === updatePasswordDto.currentPassword) {
      throw new UnauthorizedException({
        code: 'AUTH.NEW_PASSWORD_SAME_AS_CURRENT',
        message: this.i18n.translate(
          'errors.auth.new_password_same_as_current',
          {
            lang: acceptLanguage,
          },
        ),
      });
    }

    const hashedPassword = await bcrypt.hash(updatePasswordDto.newPassword, 10);
    await this.usersService.update(user.id, { password: hashedPassword });

    return {
      message: this.i18n.translate('auth.messages.password_updated', {
        lang: acceptLanguage,
      }),
    };
  }
}
