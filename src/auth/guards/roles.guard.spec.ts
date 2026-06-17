import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../user/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: any;
  let errorSpy: jest.SpyInstance;

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
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createContext = (
    roles: UserRole[] | undefined,
    user?: { sub: number; email: string; role: UserRole },
  ): ExecutionContext => {
    reflector.getAllAndOverride.mockReturnValue(roles);

    const request = {
      method: 'GET',
      url: '/test',
      user,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  it('should allow routes without required roles', () => {
    const context = createContext(undefined);

    expect(guard.canActivate(context)).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should allow user role for user routes', () => {
    const context = createContext([UserRole.User], userPayload);

    expect(guard.canActivate(context)).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should allow employee role for employee routes', () => {
    const context = createContext([UserRole.Employee], employeePayload);

    expect(guard.canActivate(context)).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should allow shared routes for users', () => {
    const context = createContext(
      [UserRole.Employee, UserRole.User],
      userPayload,
    );

    expect(guard.canActivate(context)).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should throw when user role is not allowed', () => {
    const context = createContext([UserRole.Employee], userPayload);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(errorSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          method: 'GET',
          url: '/test',
          status: 403,
          error: 'Insufficient permissions',
        },
        null,
        2,
      ),
    );
  });

  it('should throw when request has no user', () => {
    const context = createContext([UserRole.User]);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(errorSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          method: 'GET',
          url: '/test',
          status: 403,
          error: 'Insufficient permissions',
        },
        null,
        2,
      ),
    );
  });
});
