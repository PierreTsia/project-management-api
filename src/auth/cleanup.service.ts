import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { CustomLogger } from '../common/services/logger.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class CleanupService {
  constructor(
    private readonly usersService: UsersService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('CleanupService');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredUnconfirmedAccounts() {
    this.logger.log('Starting cleanup of expired unconfirmed accounts...');

    const now = new Date();

    try {
      const result =
        await this.usersService.deleteExpiredUnconfirmedAccounts(now);

      this.logger.log(`Cleaned up ${result} expired unconfirmed accounts`);
    } catch (error) {
      this.logger.error(
        'Error during cleanup of expired accounts',
        error.stack,
      );
    }
  }
}
