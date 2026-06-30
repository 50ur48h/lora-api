import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  createTenantClient,
  type TenantPrismaClient,
} from './tenant-extension';

/**
 * PrismaService exposes two clients:
 *
 *  - the base client (`this`) for non-tenant lookups (User / Tenant during auth)
 *    and platform-admin operations, and
 *  - `this.scoped`, a tenant-aware client that scopes every query to the
 *    current request's tenant and enforces RLS via a per-operation GUC.
 *
 * Domain services should use `prisma.scoped.*` for tenant-owned data.
 * (Note: the field is named `scoped` to avoid colliding with PrismaClient's
 * built-in `tenant` model delegate.)
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  readonly scoped: TenantPrismaClient = createTenantClient(this);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
