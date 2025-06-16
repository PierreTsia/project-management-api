import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { I18nService } from 'nestjs-i18n';
import { CustomLogger } from '../common/services/logger.service';

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly i18n: I18nService,
    private readonly logger: CustomLogger,
  ) {
    this.logger.setContext('EmailService');
  }

  async sendEmailConfirmation(email: string, token: string, lang?: string) {
    const confirmationUrl = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;
    const subject = this.i18n.translate('email.confirm_email.subject', {
      lang,
    });

    try {
      await this.mailerService.sendMail({
        to: email,
        subject,
        template: 'confirm-email',
        context: {
          confirmationUrl,
        },
      });
      this.logger.log(`Confirmation email sent to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send confirmation email to ${email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendPasswordReset(email: string, token: string, lang?: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const subject = this.i18n.translate('email.reset_password.subject', {
      lang,
    });

    try {
      await this.mailerService.sendMail({
        to: email,
        subject,
        template: 'reset-password',
        context: {
          resetUrl,
        },
      });
      this.logger.log(`Password reset email sent to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
