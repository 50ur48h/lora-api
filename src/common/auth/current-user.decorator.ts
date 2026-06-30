import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedUser } from './authenticated-user';

/** Injects the authenticated user resolved by the JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    if (!req.user) {
      throw new UnauthorizedException('No authenticated user on request');
    }
    return req.user;
  },
);
