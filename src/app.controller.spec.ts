import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { I18nService } from 'nestjs-i18n';

describe('AppController', () => {
  let appController: AppController;

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
  });

  describe('root', () => {
    it('should be defined', async () => {
      expect(appController).toBeDefined();
    });
  });
});
