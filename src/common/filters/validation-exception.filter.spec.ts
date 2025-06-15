import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ValidationExceptionFilter } from './validation-exception.filter';

describe('ValidationExceptionFilter', () => {
  let filter: ValidationExceptionFilter;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const mockRequest = {
    url: '/test',
    method: 'POST',
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationExceptionFilter,
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn().mockImplementation((key: string) => key),
          },
        },
      ],
    }).compile();

    filter = module.get<ValidationExceptionFilter>(ValidationExceptionFilter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should format validation errors', () => {
      const validationError = new BadRequestException({
        message: [
          'email must be an email',
          'password must be longer than 6 characters',
        ],
        error: 'Bad Request',
        statusCode: 400,
      });

      filter.catch(validationError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'VALIDATION.FAILED',
        message: 'validation.failed',
        status: 400,
        meta: {
          language: 'en',
          errors: [
            'email must be an email',
            'password must be longer than 6 characters',
          ],
        },
      });
    });

    it('should handle single validation error message', () => {
      const validationError = new BadRequestException({
        message: 'Invalid input',
        error: 'Bad Request',
        statusCode: 400,
      });

      filter.catch(validationError, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'VALIDATION.INVALID_REQUEST',
        message: 'validation.invalid_request',
        status: 400,
        meta: {
          language: 'en',
        },
      });
    });

    it('should handle errors without accept-language header', () => {
      const validationError = new BadRequestException({
        message: ['Invalid input'],
        error: 'Bad Request',
        statusCode: 400,
      });

      const requestWithoutLang = {
        ...mockRequest,
        headers: {},
      };
      const hostWithoutLang = {
        ...mockHost,
        getRequest: jest.fn().mockReturnValue(requestWithoutLang),
      } as unknown as ArgumentsHost;

      filter.catch(validationError, hostWithoutLang);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 'VALIDATION.FAILED',
        message: 'validation.failed',
        status: 400,
        meta: {
          language: undefined,
          errors: ['Invalid input'],
        },
      });
    });
  });
});
