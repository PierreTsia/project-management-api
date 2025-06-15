import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile as GoogleProfile } from 'passport-google-oauth20';

import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private configService: ConfigService;

  constructor(
    configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL')!,
      scope: ['email', 'profile'],
      passReqToCallback: true,
      proxy: true,
    });
    this.configService = configService;
  }

  async validate(
    request: Request,
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
  ) {
    try {
      const { id, emails, displayName, photos } = profile;

      if (!emails?.[0]?.value) {
        throw new UnauthorizedException('No email provided by Google');
      }

      const user = await this.authService.findOrCreateUser({
        provider: 'google',
        providerId: id,
        email: emails[0].value,
        name: displayName || emails[0].value.split('@')[0],
        avatarUrl: photos?.[0]?.value,
      });

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException(
        'Error processing Google authentication',
      );
    }
  }
}
