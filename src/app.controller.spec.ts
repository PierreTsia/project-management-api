import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { I18nService } from 'nestjs-i18n';

describe('AppController', () => {
  let appController: AppController;
  let i18nService: I18nService;

  beforeEach(async () => {
    const mockI18nService = {
      translate: jest.fn().mockImplementation((key) => key),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    i18nService = app.get<I18nService>(I18nService);
  });

  describe('root', () => {
    it('should return translated message', async () => {
      const result = await appController.getHello();
      expect(result).toBe('test.day_interval');
      expect(i18nService.translate).toHaveBeenCalledWith('test.day_interval', {
        args: {
          count: 3,
        },
      });
    });
  });
});
