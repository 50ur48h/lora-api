import { AsyncLocalStorage } from 'node:async_hooks';
import type { Role } from '@prisma/client';

/**
 * Per-request tenant context. Stored in AsyncLocalStorage so the data layer
 * can scope every query to the caller's tenant without each call site having
 * to remember a `where: { tenantId }`.
 */
export interface TenantContext {
  tenantId: string;
  userId: string;
  role: Role;
}

export const tenantStore = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantStore.getStore();
}

export function currentTenantId(): string | undefined {
  return tenantStore.getStore()?.tenantId;
}

/** Runs `fn` with the given tenant context bound for its async lifetime. */
export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return tenantStore.run(ctx, fn);
}
