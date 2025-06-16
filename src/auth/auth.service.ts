import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
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
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from 'src/users/entities/user.entity';
import { CustomLogger } from '../common/services/logger.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly i18n: I18nService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('AuthService');
  }

  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async generateTokens(payload: { email: string; id: string }) {
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
      this.logger.warn(`Registration attempt with existing email: ${email}`);
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

    this.logger.log(`New user registered: ${email}`);

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
      this.logger.warn(`Login attempt with non-existent email: ${email}`);
      throw new UnauthorizedException({
        status: 401,
        code: 'AUTH.INVALID_CREDENTIALS',
        message: this.i18n.translate('auth.errors.invalid_credentials'),
      });
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password attempt for user: ${email}`);
      throw new UnauthorizedException({
        status: 401,
        code: 'AUTH.INVALID_CREDENTIALS',
        message: this.i18n.translate('auth.errors.invalid_credentials'),
      });
    }

    // Check if email is confirmed
    if (!user.isEmailConfirmed) {
      this.logger.warn(`Login attempt with unconfirmed email: ${email}`);
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

    this.logger.log(`User logged in successfully: ${email}`);

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

    let payload;
    try {
      payload = await this.refreshTokenService.validateRefreshToken(cleanToken);
    } catch (error) {
      this.logger.error(
        `Failed to validate refresh token: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException({
        status: 401,
        code: 'AUTH.INVALID_REFRESH_TOKEN',
        message: this.i18n.translate('auth.errors.invalid_refresh_token', {
          lang: acceptLanguage,
        }),
      });
    }

    if (!payload) {
      this.logger.warn('Invalid refresh token attempt');
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
      this.logger.warn(
        `User not found during token refresh: ${payload.user.id}`,
      );
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

    this.logger.log(`Tokens refreshed for user: ${user.email}`);

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
    this.logger.log('User logged out successfully');
    return { message: this.i18n.translate('auth.messages.logout_success') };
  }

  async confirmEmail({ token }: ConfirmEmailDto) {
    const user = await this.usersService.findByEmailConfirmationToken(token);
    if (!user) {
      this.logger.warn(`Invalid email confirmation token attempt: ${token}`);
      throw new NotFoundException(
        this.i18n.translate('auth.errors.invalid_token'),
      );
    }

    const currentDate = new Date();
    if (
      user.emailConfirmationExpires &&
      user.emailConfirmationExpires < currentDate
    ) {
      this.logger.warn(`Expired email confirmation token: ${token}`);
      throw new UnauthorizedException(
        this.i18n.translate('auth.errors.token_expired'),
      );
    }

    await this.usersService.update(user.id, {
      isEmailConfirmed: true,
      emailConfirmationToken: null,
      emailConfirmationExpires: null,
    });

    this.logger.log(`Email confirmed for user: ${user.email}`);

    return { message: this.i18n.translate('auth.messages.email_confirmed') };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );
      return {
        message: this.i18n.translate('auth.messages.reset_link_sent'),
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.update(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    await this.emailService.sendPasswordReset(user.email, resetToken);

    this.logger.log(`Password reset email sent to: ${email}`);

    return {
      message: this.i18n.translate('auth.messages.reset_link_sent'),
    };
  }

  async resetPassword({ token, password }: ResetPasswordDto) {
    const user = await this.usersService.findByPasswordResetToken(token);
    if (!user) {
      this.logger.warn(`Invalid password reset token attempt: ${token}`);
      throw new NotFoundException(
        this.i18n.translate('auth.errors.invalid_token'),
      );
    }

    const currentDate = new Date();
    if (user.passwordResetExpires && user.passwordResetExpires < currentDate) {
      this.logger.warn(`Expired password reset token: ${token}`);
      throw new UnauthorizedException(
        this.i18n.translate('auth.errors.token_expired'),
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.usersService.update(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    this.logger.log(`Password reset successful for user: ${user.email}`);

    return {
      message: this.i18n.translate('auth.messages.password_reset_success'),
    };
  }

  async resendConfirmation({ email }: ResendConfirmationDto) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      this.logger.warn(
        `Confirmation resend requested for non-existent email: ${email}`,
      );
      return {
        message: this.i18n.translate('auth.messages.confirmation_email_sent'),
      };
    }

    if (user.isEmailConfirmed) {
      this.logger.warn(
        `Confirmation resend requested for already confirmed email: ${email}`,
      );
      throw new ConflictException(
        this.i18n.translate('auth.errors.already_confirmed'),
      );
    }

    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const confirmationExpires = new Date();
    confirmationExpires.setDate(confirmationExpires.getDate() + 7); // 7 days from now

    await this.usersService.update(user.id, {
      emailConfirmationToken: confirmationToken,
      emailConfirmationExpires: confirmationExpires,
    });

    await this.emailService.sendEmailConfirmation(email, confirmationToken);

    this.logger.log(`Confirmation email resent to: ${email}`);

    return {
      message: this.i18n.translate('auth.messages.confirmation_email_sent'),
    };
  }

  async updatePassword(
    email: string,
    updatePasswordDto: UpdatePasswordDto,
    acceptLanguage?: string,
  ) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(
        `Password update attempted for non-existent user: ${email}`,
      );
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
      this.logger.warn(
        `Invalid current password during password update for user: ${email}`,
      );
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

    this.logger.log(`Password updated successfully for user: ${email}`);

    return {
      message: this.i18n.translate('auth.messages.password_updated', {
        lang: acceptLanguage,
      }),
    };
  }

  async findOrCreateUser({
    provider,
    providerId,
    email,
    name,
    avatarUrl,
  }: {
    provider: 'google';
    providerId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): Promise<User> {
    try {
      if (provider !== 'google') {
        throw new BadRequestException('Invalid provider type');
      }

      let user = await this.usersService.findByProviderId(provider, providerId);
      if (user) {
        return user;
      }

      user = await this.usersService.findByEmail(email);
      if (user) {
        if (!user.provider || !user.providerId) {
          this.logger.log(
            `Linking existing user to ${provider} OAuth: ${email}`,
          );
          user = await this.usersService.update(user.id, {
            provider,
            providerId,
            avatarUrl,
          });
        }

        return user;
      }

      this.logger.log(`Creating new user from ${provider} OAuth: ${email}`);
      user = await this.usersService.create({
        email,
        name,
        provider,
        providerId,
        avatarUrl,
        isEmailConfirmed: true, // Social auth emails are pre-verified
      });

      return user;
    } catch (error) {
      this.logger.error(
        `Failed to find or create user for ${email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
