import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly i18n: I18nService,
  ) {}

  async sendEmailConfirmation(email: string, token: string, lang?: string) {
    const confirmationUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;
    const subject = this.i18n.translate('email.confirm_email.subject', {
      lang,
    });

    await this.mailerService.sendMail({
      to: email,
      subject,
      template: 'confirm-email',
      context: {
        confirmationUrl,
      },
    });
  }

  async sendPasswordReset(email: string, token: string, lang?: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const subject = this.i18n.translate('email.reset_password.subject', {
      lang,
    });

    await this.mailerService.sendMail({
      to: email,
      subject,
      template: 'reset-password',
      context: {
        resetUrl,
      },
    });
  }
}
