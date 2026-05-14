import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../roles.decorator';
import { UserRole } from '../../user/role.enum';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieNames = this.getCookieNames(context, request);
    const tokens = cookieNames
      .map((cookieName) => request.cookies?.[cookieName])
      .filter(Boolean);

    if (!tokens.length) {
      this.logger.error(
        JSON.stringify(
          {
            method: request.method,
            url: request.url,
            status: 401,
            error: 'No token provided',
          },
          null,
          2,
        ),
      );

      throw new UnauthorizedException('No token provided');
    }

    for (const token of tokens) {
      try {
        const payload = await this.jwtService.verifyAsync(token);
        request['user'] = payload;
        return true;
      } catch {
        continue;
      }
    }

    this.logger.error(
      JSON.stringify(
        {
          method: request.method,
          url: request.url,
          status: 401,
          error: 'Invalid or expired token',
        },
        null,
        2,
      ),
    );
    throw new UnauthorizedException('Invalid or expired token');
  }

  private getCookieNames(context: ExecutionContext, request: Request): string[] {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length) {
      return ['user_access_token', 'employee_access_token'];
    }

    if (roles.length > 1) {
      const origin = request.headers.origin ?? request.headers.referer ?? '';

      if (origin.includes('backoffice')) {
        return ['employee_access_token'];
      }

      if (origin.includes('frontend')) {
        return ['user_access_token'];
      }
    }

    return roles.map((role) =>
      role === UserRole.User ? 'user_access_token' : 'employee_access_token',
    );
  }
}
