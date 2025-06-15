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

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'SYSTEM.UNKNOWN_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        code = `HTTP.${status}`;
      } else if (typeof res === 'object' && res !== null) {
        const { message: msg, error: err, code: errCode } = res as any;
        message = msg || err || message;
        code = errCode || `HTTP.${status}`;
      }
    }

    console.error('Exception caught by global filter:', {
      exception,
      path: request.url,
      method: request.method,
      body: request.body,
      status,
      message,
      code,
    });

    return response.status(status).json({
      code,
      message: this.i18n.translate(`errors.${code.toLowerCase()}`, {
        lang: acceptLanguage,
      }),
      status,
      meta: {
        language: acceptLanguage,
      },
    });
  }
}
