import { PrismaClient } from '@prisma/client';
import { currentTenantId } from '../tenancy/tenant-context';

/**
 * Tenant-owned models. Every one of these carries a required `tenantId` and is
 * protected by Row-Level Security in Postgres. `Tenant` and `User` are excluded:
 * they are looked up during authentication, before a tenant context exists.
 */
const TENANT_MODELS = new Set<string>([
  'Store',
  'Staff',
  'Service',
  'Availability',
  'Customer',
  'Booking',
  'Payment',
  'Theme',
  'Coupon',
  'LoyaltyMembership',
  'LoyaltyLedgerEntry',
  'Notification',
  'AuditLog',
]);

const WHERE_OPS = new Set<string>([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

type AnyArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
};

/**
 * App-layer tenant scoping (the primary guard; also keeps query plans on the
 * `tenantId`-leading indexes). RLS is the defense-in-depth backstop.
 *
 * Unique-target operations (`findUnique`, `update`, `delete`, `upsert`) are left
 * untouched here to preserve Prisma's unique-where semantics — RLS still scopes
 * them at the database layer.
 */
function injectTenant(operation: string, args: AnyArgs, tenantId: string): void {
  if (WHERE_OPS.has(operation)) {
    args.where = { ...(args.where ?? {}), tenantId };
    return;
  }
  if (operation === 'create') {
    const data = (args.data as Record<string, unknown>) ?? {};
    args.data = { tenantId, ...data };
    return;
  }
  if (operation === 'createMany') {
    if (Array.isArray(args.data)) {
      args.data = args.data.map((d) => ({ tenantId, ...d }));
    }
  }
}

/**
 * Wraps a base PrismaClient with a tenant-aware extension:
 *  1. injects `tenantId` into reads/writes (app-layer scoping), and
 *  2. runs each tenant-model operation inside a transaction that sets the
 *     transaction-local `app.current_tenant` GUC, which the RLS policies read.
 *
 * Setting the GUC and running the query in the SAME batch transaction makes it
 * safe under PgBouncer transaction-mode pooling.
 */
function createTenantClient(base: PrismaClient) {
  return base.$extends({
    name: 'tenant-rls',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_MODELS.has(model)) {
            return query(args);
          }
          const tenantId = currentTenantId();
          if (!tenantId) {
            // No tenant in context: RLS will still yield zero rows because the
            // GUC is unset (current_setting(..., true) => NULL).
            return query(args);
          }

          injectTenant(operation, args as AnyArgs, tenantId);

          const [, result] = await base.$transaction([
            base.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
}

export type TenantPrismaClient = ReturnType<typeof createTenantClient>;

export { createTenantClient, TENANT_MODELS };
