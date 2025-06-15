import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const acceptLanguage = request.headers['accept-language'];

    // Let HttpExceptions pass through - they are handled by their respective services
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      return response.status(status).json(res);
    }

    // Handle only unknown/generic errors
    console.error('Exception caught by global filter:', {
      exception,
      path: request.url,
      method: request.method,
      body: request.body,
    });

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'SYSTEM.UNKNOWN_ERROR',
      message: this.i18n.translate('errors.system.unknown', {
        lang: acceptLanguage,
      }),
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      meta: {
        language: acceptLanguage,
      },
    });
  }
}
