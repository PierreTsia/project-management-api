import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { I18nService } from 'nestjs-i18n';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let mailerService: MailerService;
  let i18nService: I18nService;

  const mockTranslate = jest.fn().mockImplementation((key: string) => key);

  beforeEach(async () => {
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
            translate: mockTranslate,
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    mailerService = module.get<MailerService>(MailerService);
    i18nService = module.get<I18nService>(I18nService);

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
          confirmationUrl:
            'http://localhost:3000/confirm-email?token=confirmation-token',
        },
      });
      expect(i18nService.translate).toHaveBeenCalledWith(
        'email.confirm_email.subject',
        { lang },
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
          confirmationUrl:
            'http://localhost:3000/confirm-email?token=confirmation-token',
        },
      });
      expect(i18nService.translate).toHaveBeenCalledWith(
        'email.confirm_email.subject',
        { lang: undefined },
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
          resetUrl: 'http://localhost:3000/reset-password?token=reset-token',
        },
      });
      expect(i18nService.translate).toHaveBeenCalledWith(
        'email.reset_password.subject',
        { lang },
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
          resetUrl: 'http://localhost:3000/reset-password?token=reset-token',
        },
      });
      expect(i18nService.translate).toHaveBeenCalledWith(
        'email.reset_password.subject',
        { lang: undefined },
      );
    });
  });
});
