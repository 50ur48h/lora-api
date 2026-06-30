import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { runWithTenant } from '../../common/tenancy/tenant-context';
import type { PublicStoreResponseDto } from './dto/public-store-response.dto';

/**
 * Synthetic principal for unauthenticated public requests. Only `tenantId` is
 * consumed by the data layer; `userId`/`role` satisfy the context shape.
 */
const PUBLIC_USER_ID = '00000000-0000-0000-0000-000000000000';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves a store by its public slug and returns the data a booking page
   * needs. Resolution uses a SECURITY DEFINER function (the only cross-tenant
   * lookup the app role can do); everything after runs under the resolved
   * tenant's RLS context.
   */
  async getStoreBySlug(slug: string): Promise<PublicStoreResponseDto> {
    const [resolved] = await this.prisma.$queryRaw<
      Array<{ store_id: string; tenant_id: string }>
    >`SELECT store_id, tenant_id FROM resolve_store_by_slug(${slug})`;

    if (!resolved) {
      throw new NotFoundException('Store not found');
    }

    return runWithTenant(
      {
        tenantId: resolved.tenant_id,
        userId: PUBLIC_USER_ID,
        role: Role.CUSTOMER,
      },
      async () => {
        const store = await this.prisma.scoped.store.findUnique({
          where: { id: resolved.store_id },
          include: {
            theme: true,
            services: {
              where: { active: true },
              orderBy: { name: 'asc' },
            },
          },
        });
        if (!store) {
          throw new NotFoundException('Store not found');
        }

        return {
          id: store.id,
          name: store.name,
          slug: store.slug,
          timezone: store.timezone,
          theme: store.theme
            ? {
                logoUrl: store.theme.logoUrl,
                colors: toStringRecord(store.theme.colors),
                fonts: toStringRecord(store.theme.fonts),
              }
            : null,
          services: store.services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMin: s.durationMin,
            priceCents: s.priceCents,
          })),
        };
      },
    );
  }
}

/** Coerce a Prisma `Json` value into a flat string map, dropping non-strings. */
function toStringRecord(value: unknown): Record<string, string> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const out: Record<string, string> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (typeof val === 'string') out[key] = val;
    }
    return out;
  }
  return {};
}
