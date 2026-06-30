import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { UsersService } from '../../modules/users/users.service';
import type { AuthenticatedUser } from './authenticated-user';
import { extractBearerToken, verifySupabaseJwt } from './jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let sub: string;
    let email: string | undefined;
    try {
      const payload = await verifySupabaseJwt(
        token,
        this.config.supabaseJwtSecret,
      );
      sub = payload.sub;
      email = payload.email;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.users.loadContext(sub, email);
    if (!user) {
      throw new UnauthorizedException('User not provisioned');
    }

    req.user = user;
    return true;
  }
}
