import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the identity context from the JWT `sub`. Uses the base client
   * (not tenant-scoped): this runs during authentication, before tenant
   * context exists, and `User` is not an RLS-protected table.
   */
  async loadContext(
    id: string,
    _email?: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      storeId: user.storeId,
    };
  }
}
