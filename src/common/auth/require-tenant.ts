import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from './authenticated-user';

/**
 * Returns the user's tenantId or throws. For tenant-owned write endpoints where
 * a platform admin (no tenant) has nothing to write against.
 */
export function requireTenant(user: AuthenticatedUser): string {
  if (!user.tenantId) {
    throw new ForbiddenException('User is not associated with a tenant');
  }
  return user.tenantId;
}
