import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { I18nService } from 'nestjs-i18n';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly i18n: I18nService,
  ) {}

  async validateRefreshToken(
    token: string,
    acceptLanguage?: string,
  ): Promise<RefreshToken> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!refreshToken) {
      throw new UnauthorizedException({
        code: 'AUTH.INVALID_REFRESH_TOKEN',
        message: this.i18n.translate('errors.auth.invalid_refresh_token', {
          lang: acceptLanguage,
        }),
      });
    }

    if (refreshToken.revokedAt) {
      throw new UnauthorizedException({
        code: 'AUTH.REFRESH_TOKEN_REVOKED',
        message: this.i18n.translate('errors.auth.refresh_token_revoked', {
          lang: acceptLanguage,
        }),
      });
    }

    if (refreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'AUTH.REFRESH_TOKEN_EXPIRED',
        message: this.i18n.translate('errors.auth.refresh_token_expired', {
          lang: acceptLanguage,
        }),
      });
    }

    return refreshToken;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token },
      { revokedAt: new Date() },
    );
  }

  async createRefreshToken(
    userId: string,
    token: string,
    expiresIn: number,
  ): Promise<RefreshToken> {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    const refreshToken = this.refreshTokenRepository.create({
      token,
      user: { id: userId },
      expiresAt,
    });

    return this.refreshTokenRepository.save(refreshToken);
  }
}
