import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { I18nService } from 'nestjs-i18n';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  async getHello() {
    return this.i18n.translate('test.day_interval', {
      args: {
        count: 3,
      },
    });
  }
}
