import {
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          this.logger.log(
            JSON.stringify({
              method: request.method,
              url: request.url,
              status: response.statusCode,
            }, null, 2),
          );
        },
        error: (error) => {
          const status =
            error instanceof HttpException
              ? error.getStatus()
              : HttpStatus.INTERNAL_SERVER_ERROR;

          this.logger.error(
            JSON.stringify({
              method: request.method,
              url: request.url,
              status,
              error: this.getErrorMessage(error),
            }, null, 2),
          );
        },
      }),
    );
  }

  private getErrorMessage(error: Error) {
    if (!(error instanceof HttpException)) return error.message;

    const response = error.getResponse();
    if (typeof response === 'string') return response;

    if (typeof response === 'object' && response !== null && 'error' in response) {
      return response.error;
    }

    return error.message;
  }
}
