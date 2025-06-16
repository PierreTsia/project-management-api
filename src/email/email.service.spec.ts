import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { I18nService } from 'nestjs-i18n';
import { EmailService } from './email.service';
import { MockCustomLogger } from '../test/mocks';
import { CustomLogger } from '../common/services/logger.service';

describe('EmailService', () => {
  let service: EmailService;
  let mailerService: MailerService;
  let mockLogger: MockCustomLogger;

  beforeEach(async () => {
    mockLogger = new MockCustomLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn().mockImplementation((key: string) => key),
          },
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mailerService = module.get<MailerService>(MailerService);

    // Mock environment variable
    process.env.FRONTEND_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmailConfirmation', () => {
    it('should send confirmation email with correct parameters', async () => {
      const email = 'test@example.com';
      const token = 'confirmation-token';
      const lang = 'en';

      await service.sendEmailConfirmation(email, token, lang);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'email.confirm_email.subject',
        template: 'confirm-email',
        context: {
          confirmationUrl: expect.stringContaining(token),
        },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Confirmation email sent to: ${email}`,
      );
    });

    it('should send confirmation email without language parameter', async () => {
      const email = 'test@example.com';
      const token = 'confirmation-token';

      await service.sendEmailConfirmation(email, token);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'email.confirm_email.subject',
        template: 'confirm-email',
        context: {
          confirmationUrl: expect.stringContaining(token),
        },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Confirmation email sent to: ${email}`,
      );
    });

    it('should log error when email sending fails', async () => {
      const email = 'test@example.com';
      const token = 'confirmation-token';
      const error = new Error('Failed to send email');

      jest.spyOn(mailerService, 'sendMail').mockRejectedValue(error);

      await expect(service.sendEmailConfirmation(email, token)).rejects.toThrow(
        error,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to send confirmation email to ${email}: ${error.message}`,
        error.stack,
      );
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email with correct parameters', async () => {
      const email = 'test@example.com';
      const token = 'reset-token';
      const lang = 'en';

      await service.sendPasswordReset(email, token, lang);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'email.reset_password.subject',
        template: 'reset-password',
        context: {
          resetUrl: expect.stringContaining(token),
        },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Password reset email sent to: ${email}`,
      );
    });

    it('should send password reset email without language parameter', async () => {
      const email = 'test@example.com';
      const token = 'reset-token';

      await service.sendPasswordReset(email, token);

      expect(mailerService.sendMail).toHaveBeenCalledWith({
        to: email,
        subject: 'email.reset_password.subject',
        template: 'reset-password',
        context: {
          resetUrl: expect.stringContaining(token),
        },
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        `Password reset email sent to: ${email}`,
      );
    });

    it('should log error when password reset email sending fails', async () => {
      const email = 'test@example.com';
      const token = 'reset-token';
      const error = new Error('Failed to send email');

      jest.spyOn(mailerService, 'sendMail').mockRejectedValue(error);

      await expect(service.sendPasswordReset(email, token)).rejects.toThrow(
        error,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to send password reset email to ${email}: ${error.message}`,
        error.stack,
      );
    });
  });
});
