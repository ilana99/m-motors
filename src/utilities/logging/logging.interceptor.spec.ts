import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { lastValueFrom, Observable, of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const createContext = (statusCode = 200) =>
    ({
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'GET',
          url: '/clientfile',
        }),
        getResponse: jest.fn().mockReturnValue({
          statusCode,
        }),
      }),
    }) as unknown as ExecutionContext;

  const createNext = (response$: Observable<unknown>) =>
    ({
      handle: jest.fn().mockReturnValue(response$),
    }) as unknown as CallHandler;

  const loggedError = () => {
    const firstCall = errorSpy.mock.calls[0];
    const message = firstCall[0];

    return JSON.parse(message);
  };

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    interceptor = new LoggingInterceptor();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log successful requests', async () => {
    const context = createContext(201);
    const response = { ok: true };
    const next = createNext(of(response));

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toBe(
      response,
    );

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          method: 'GET',
          url: '/clientfile',
          status: 201,
        },
        null,
        2,
      ),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should log http errors with string response', async () => {
    const context = createContext();
    const error = new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
    const next = createNext(throwError(() => error));

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toBe(
      error,
    );

    expect(loggedError()).toEqual({
      method: 'GET',
      url: '/clientfile',
      status: HttpStatus.BAD_REQUEST,
      error: 'Invalid request',
    });
  });

  it('should log http errors with message response', async () => {
    const context = createContext();
    const error = new BadRequestException('File buffer is missing');
    const next = createNext(throwError(() => error));

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toBe(
      error,
    );

    expect(loggedError()).toEqual({
      method: 'GET',
      url: '/clientfile',
      status: HttpStatus.BAD_REQUEST,
      error: 'File buffer is missing',
    });
  });

  it('should log http errors with error response', async () => {
    const context = createContext();
    const error = new HttpException(
      { error: 'Forbidden' },
      HttpStatus.FORBIDDEN,
    );
    const next = createNext(throwError(() => error));

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toBe(
      error,
    );

    expect(loggedError()).toEqual({
      method: 'GET',
      url: '/clientfile',
      status: HttpStatus.FORBIDDEN,
      error: 'Forbidden',
    });
  });

  it('should log http errors with fallback message', async () => {
    const context = createContext();
    const error = new HttpException({ test: 'test' }, HttpStatus.BAD_REQUEST);
    const next = createNext(throwError(() => error));

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toBe(
      error,
    );

    expect(loggedError()).toEqual({
      method: 'GET',
      url: '/clientfile',
      status: HttpStatus.BAD_REQUEST,
      error: error.message,
    });
  });

  it('should log unknown errors as internal server errors', async () => {
    const context = createContext();
    const error = new Error('Unexpected error');
    const next = createNext(throwError(() => error));

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toBe(
      error,
    );

    expect(loggedError()).toEqual({
      method: 'GET',
      url: '/clientfile',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Unexpected error',
    });
  });
});
