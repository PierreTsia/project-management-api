import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class AppService {
  constructor(private readonly i18n: I18nService) {}

  getHello(): string {
    return this.i18n.translate('test.day_interval', {
      args: {
        count: 3,
      },
    });
  }

  async checkDatabaseHealth() {
    const now = new Date();
    return {
      status: 'ok',
      database: this.i18n.translate('app.health.database.connected'),
      timestampISO: now.toISOString(),
    };
  }
}
