import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantStore, type TenantContext } from './tenant-context';
import type { AuthenticatedUser } from '../auth/authenticated-user';

/**
 * After the JwtAuthGuard has populated `req.user`, this interceptor binds the
 * tenant context into AsyncLocalStorage for the lifetime of the request so the
 * Prisma extension can scope queries and set the RLS GUC.
 *
 * Guards run before interceptors, so `req.user` is already available here.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    const user = req.user;
    if (!user?.tenantId) {
      // Unauthenticated (public route) or a user without a tenant (e.g. a
      // consumer). No tenant context => RLS yields zero rows for tenant tables.
      return next.handle();
    }

    const ctx: TenantContext = {
      tenantId: user.tenantId,
      userId: user.id,
      role: user.role,
    };

    return new Observable((subscriber) => {
      tenantStore.run(ctx, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
