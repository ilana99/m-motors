import {
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { UserRole } from '../../user/role.enum';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: any;
  let reflector: any;

  const userPayload = {
    sub: 1,
    email: 'user@gmail.com',
    role: UserRole.User,
  };
  const employeePayload = {
    sub: 2,
    email: 'employee@gmail.com',
    role: UserRole.Employee,
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jwtService = {
      verifyAsync: jest.fn((token: string) => {
        if (token === 'user.token') return Promise.resolve(userPayload);
        if (token === 'employee.token') return Promise.resolve(employeePayload);
        return Promise.reject(new Error('Invalid token'));
      }),
    };
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new AuthGuard(
      jwtService as JwtService,
      reflector as unknown as Reflector,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createContext = (
    roles: UserRole[],
    cookies: Record<string, string>,
    origin = '',
  ): ExecutionContext => {
    reflector.getAllAndOverride.mockReturnValue(roles);

    const request = {
      method: 'GET',
      url: '/test',
      cookies,
      headers: { origin },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('should use user cookie for user routes', async () => {
    const context = createContext(
      [UserRole.User],
      {
        user_access_token: 'user.token',
        employee_access_token: 'employee.token',
      },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('user.token');
  });

  it('should use employee cookie for employee routes', async () => {
    const context = createContext(
      [UserRole.Employee],
      {
        user_access_token: 'user.token',
        employee_access_token: 'employee.token',
      },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('employee.token');
  });

  it('should use user cookie for shared routes from frontend', async () => {
    const context = createContext(
      [UserRole.Employee, UserRole.User],
      {
        user_access_token: 'user.token',
        employee_access_token: 'employee.token',
      },
      'https://m-motors-frontend.onrender.com',
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('user.token');
  });

  it('should use employee cookie for shared routes from backoffice', async () => {
    const context = createContext(
      [UserRole.Employee, UserRole.User],
      {
        user_access_token: 'user.token',
        employee_access_token: 'employee.token',
      },
      'https://m-motors-backoffice.onrender.com',
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('employee.token');
  });

  it('should throw when the expected cookie is missing', async () => {
    const context = createContext(
      [UserRole.User],
      {
        employee_access_token: 'employee.token',
      },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
