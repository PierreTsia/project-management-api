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

    // Handle HttpExceptions with formatted responses
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      // If the response is already formatted (has code and message), pass it through
      if (
        typeof res === 'object' &&
        res !== null &&
        'code' in res &&
        'message' in res
      ) {
        return response.status(status).json({
          ...res,
          status,
          meta: {
            language: acceptLanguage,
          },
        });
      }

      // Handle other HttpExceptions (like validation errors)
      return response.status(status).json({
        code: `HTTP.${status}`,
        message: this.i18n.translate(`errors.http.${status}`, {
          lang: acceptLanguage,
        }),
        status,
        meta: {
          language: acceptLanguage,
        },
      });
    }

    // Handle unknown errors
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
