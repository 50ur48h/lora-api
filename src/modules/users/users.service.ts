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
   *
   * If no row matches the `sub` but one matches the token's email, that row is
   * a pre-provisioned (seeded/invited) user signing in through Supabase for the
   * first time — adopt it by linking the Supabase auth id. `User.email` is
   * unique and nothing references `User.id`, so re-keying the row is safe.
   */
  async loadContext(
    id: string,
    email?: string,
  ): Promise<AuthenticatedUser | null> {
    let user = await this.prisma.user.findUnique({ where: { id } });

    if (!user && email) {
      const invited = await this.prisma.user.findUnique({ where: { email } });
      if (invited) {
        user = await this.prisma.user.update({
          where: { email },
          data: { id },
        });
      }
    }

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
