import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!requiredRoles.includes(user?.role)) {
      const request = context.switchToHttp().getRequest();

      this.logger.error(
        JSON.stringify(
          {
            method: request.method,
            url: request.url,
            status: 403,
            error: 'Insufficient permissions',
          },
          null,
          2,
        ),
      );

      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
