import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { RefreshTokenService } from '../refresh-token.service';

@Injectable()
export class RefreshTokenGuard {
  constructor(
    private refreshTokenService: RefreshTokenService,
    private readonly i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException(
        this.i18n.translate('auth.errors.invalid_refresh_token'),
      );
    }

    const refreshToken = authHeader.replace('Bearer ', '');
    const payload =
      await this.refreshTokenService.validateRefreshToken(refreshToken);

    if (!payload) {
      throw new UnauthorizedException(
        this.i18n.translate('auth.errors.invalid_refresh_token'),
      );
    }

    // Attach the user ID to the request for later use
    request.user = { id: payload.user.id };
    return true;
  }
}
