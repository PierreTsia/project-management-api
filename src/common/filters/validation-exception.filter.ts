import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';

interface ValidationErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const acceptLanguage = request.headers['accept-language'];
    const status = exception.getStatus();
    const exceptionResponse =
      exception.getResponse() as ValidationErrorResponse;

    // If it's a validation error, format it nicely
    if (Array.isArray(exceptionResponse.message)) {
      return response.status(status).json({
        code: 'VALIDATION.FAILED',
        message: this.i18n.translate('validation.failed', {
          lang: acceptLanguage,
        }),
        status,
        meta: {
          language: acceptLanguage,
          errors: exceptionResponse.message,
        },
      });
    }

    // For other bad requests, return as is
    return response.status(status).json({
      code: 'VALIDATION.INVALID_REQUEST',
      message: this.i18n.translate('validation.invalid_request', {
        lang: acceptLanguage,
      }),
      status,
      meta: {
        language: acceptLanguage,
      },
    });
  }
}
