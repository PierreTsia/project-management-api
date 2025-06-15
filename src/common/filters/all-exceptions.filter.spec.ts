import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let originalConsoleError: typeof console.error;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const mockRequest = {
    url: '/test',
    method: 'GET',
    body: {},
    headers: {
      'accept-language': 'en',
    },
  };

  const mockHost = {
    switchToHttp: jest.fn().mockReturnThis(),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRequest: jest.fn().mockReturnValue(mockRequest),
  } as unknown as ArgumentsHost;

  beforeEach(async () => {
    // Save original console.error and mock it
    originalConsoleError = console.error;
    console.error = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn().mockImplementation((key: string) => key),
          },
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
  });

  afterEach(() => {
    // Restore original console.error
    console.error = originalConsoleError;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should pass through HttpExceptions', () => {
      const httpException = new HttpException(
        { message: 'Test error' },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(httpException, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Test error',
      });
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'SYSTEM.UNKNOWN_ERROR',
        message: 'errors.system.unknown',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        meta: {
          language: 'en',
        },
      });
    });

    it('should handle errors without accept-language header', () => {
      const error = new Error('Unknown error');
      const requestWithoutLang = {
        ...mockRequest,
        headers: {},
      };
      const hostWithoutLang = {
        ...mockHost,
        getRequest: jest.fn().mockReturnValue(requestWithoutLang),
      } as unknown as ArgumentsHost;

      filter.catch(error, hostWithoutLang);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'SYSTEM.UNKNOWN_ERROR',
        message: 'errors.system.unknown',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        meta: {
          language: undefined,
        },
      });
    });
  });
});
