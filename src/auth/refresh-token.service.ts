import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { RefreshToken } from './entities/refresh-token.entity';
import { CustomLogger } from '../common/services/logger.service';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly i18n: I18nService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('RefreshTokenService');
  }

  async validateRefreshToken(
    token: string,
    acceptLanguage?: string,
  ): Promise<RefreshToken> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!refreshToken) {
      this.logger.warn(`Invalid refresh token attempted: ${token}`);
      throw new UnauthorizedException({
        code: 'AUTH.INVALID_REFRESH_TOKEN',
        message: this.i18n.translate('errors.auth.invalid_refresh_token', {
          lang: acceptLanguage,
        }),
      });
    }

    if (refreshToken.revokedAt) {
      this.logger.warn(
        `Revoked refresh token attempted: ${token} for user ${refreshToken.user.id}`,
      );
      throw new UnauthorizedException({
        code: 'AUTH.REFRESH_TOKEN_REVOKED',
        message: this.i18n.translate('errors.auth.refresh_token_revoked', {
          lang: acceptLanguage,
        }),
      });
    }

    if (refreshToken.expiresAt < new Date()) {
      this.logger.warn(
        `Expired refresh token attempted: ${token} for user ${refreshToken.user.id}`,
      );
      throw new UnauthorizedException({
        code: 'AUTH.REFRESH_TOKEN_EXPIRED',
        message: this.i18n.translate('errors.auth.refresh_token_expired', {
          lang: acceptLanguage,
        }),
      });
    }

    this.logger.debug(
      `Valid refresh token used: ${token} for user ${refreshToken.user.id}`,
    );
    return refreshToken;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    this.logger.debug(`Revoking refresh token: ${token}`);
    await this.refreshTokenRepository.update(
      { token },
      { revokedAt: new Date() },
    );
    this.logger.log(`Refresh token revoked successfully: ${token}`);
  }

  async createRefreshToken(
    userId: string,
    token: string,
    expiresIn: number,
  ): Promise<RefreshToken> {
    this.logger.debug(
      `Creating refresh token for user ${userId} with expiry ${expiresIn}s`,
    );
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    const refreshToken = this.refreshTokenRepository.create({
      token,
      user: { id: userId },
      expiresAt,
    });

    const savedToken = await this.refreshTokenRepository.save(refreshToken);
    this.logger.log(
      `Refresh token created successfully for user ${userId} with expiry ${expiresAt.toISOString()}`,
    );
    return savedToken;
  }
}
