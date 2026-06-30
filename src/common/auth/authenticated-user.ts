import type { Role } from '@prisma/client';

/**
 * The resolved identity attached to `req.user` after JWT verification +
 * loading the user's row. This is the shape the rest of the app trusts.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  tenantId: string | null;
  storeId: string | null;
}
