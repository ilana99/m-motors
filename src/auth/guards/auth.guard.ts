import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  constructor(private readonly jwtService: JwtService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies?.['access_token'];

    if (!token) {
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

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = payload;
    } catch {
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
    return true;
  }
}
