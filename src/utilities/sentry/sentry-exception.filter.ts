import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter {
  constructor(httpAdapterHost: HttpAdapterHost) {
    super(httpAdapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === 'http') {
      const request = host.switchToHttp().getRequest();
      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      if (status >= 400) {
        Sentry.withScope((scope) => {
          scope.setTag('method', request.method);
          scope.setTag('url', request.url);
          scope.setTag('http_status', status);

          scope.setContext('request', {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query,
          });

          if (request.user?.sub) {
            scope.setUser({ id: String(request.user.sub) });
          }

          Sentry.captureException(exception);
        });
      }
    }

    super.catch(exception, host);
  }
}
