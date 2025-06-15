import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users/entities/user.entity';

@Injectable()
export class AppService {
  constructor(
    private readonly i18n: I18nService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  getHello(): string {
    return this.i18n.translate('test.day_interval', {
      args: {
        count: 3,
      },
    });
  }

  async checkDatabaseHealth() {
    try {
      // Try to query the database
      await this.userRepository.query('SELECT 1');

      const now = new Date();
      return {
        status: 'ok',
        database: this.i18n.translate('app.health.database.connected'),
        timestampISO: now.toISOString(), // Keep ISO format for technical purposes
      };
    } catch (error) {
      const now = new Date();
      return {
        status: 'error',
        database: this.i18n.translate('app.health.database.disconnected'),
        error: error.message,
        timestampISO: now.toISOString(), // Keep ISO format for technical purposes
      };
    }
  }
}
