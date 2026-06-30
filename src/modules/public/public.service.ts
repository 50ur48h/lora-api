import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Role } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  runWithTenant,
  type TenantContext,
} from '../../common/tenancy/tenant-context';
import type { AvailabilityResponseDto } from './dto/availability-response.dto';
import type { PublicStoreResponseDto } from './dto/public-store-response.dto';
import {
  generateSlots,
  type AvailabilityWindow,
  type BusyInterval,
} from './slots';

/**
 * Synthetic principal for unauthenticated public requests. Only `tenantId` is
 * consumed by the data layer; `userId`/`role` satisfy the context shape.
 */
const PUBLIC_USER_ID = '00000000-0000-0000-0000-000000000000';
const SLOT_STEP_MIN = 30;
const BUSY_STATUSES: BookingStatus[] = [
  BookingStatus.REQUESTED,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

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
    const { storeId, tenantId } = await this.resolveStore(slug);

    return this.asTenant(tenantId, async () => {
      const store = await this.prisma.scoped.store.findUnique({
        where: { id: storeId },
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
    });
  }

  /**
   * Open booking slots for a service on a given day, computed from each active
   * staff member's working window minus their existing bookings.
   */
  async getAvailability(
    slug: string,
    serviceId: string,
    date: string,
  ): Promise<AvailabilityResponseDto> {
    const { storeId, tenantId } = await this.resolveStore(slug);

    return this.asTenant(tenantId, async () => {
      const store = await this.prisma.scoped.store.findUnique({
        where: { id: storeId },
        select: { timezone: true },
      });
      if (!store) {
        throw new NotFoundException('Store not found');
      }

      const service = await this.prisma.scoped.service.findFirst({
        where: { id: serviceId, storeId, active: true },
        select: { durationMin: true, bufferMin: true },
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }

      const staff = await this.prisma.scoped.staff.findMany({
        where: { storeId, active: true },
        select: { id: true },
      });
      const staffIds = staff.map((s) => s.id);
      if (staffIds.length === 0) {
        return { date, slots: [] };
      }

      const availabilities = await this.prisma.scoped.availability.findMany({
        where: { staffId: { in: staffIds } },
        select: {
          staffId: true,
          weekday: true,
          startTime: true,
          endTime: true,
        },
      });

      const day = DateTime.fromISO(date, { zone: store.timezone });
      const bookings = await this.prisma.scoped.booking.findMany({
        where: {
          staffId: { in: staffIds },
          status: { in: BUSY_STATUSES },
          startAt: {
            gte: day.startOf('day').toUTC().toJSDate(),
            lte: day.endOf('day').toUTC().toJSDate(),
          },
        },
        select: { staffId: true, startAt: true, endAt: true },
      });

      const windows: AvailabilityWindow[] = availabilities.map((a) => ({
        staffId: a.staffId,
        weekday: a.weekday,
        startTime: a.startTime,
        endTime: a.endTime,
      }));
      const busy: BusyInterval[] = bookings.map((b) => ({
        staffId: b.staffId,
        start: b.startAt,
        end: b.endAt,
      }));

      const slots = generateSlots({
        date,
        timezone: store.timezone,
        durationMin: service.durationMin,
        bufferMin: service.bufferMin,
        stepMin: SLOT_STEP_MIN,
        windows,
        busy,
      });

      return {
        date,
        slots: slots.map((s) => ({
          startAt: s.startAt.toISOString(),
          staffId: s.staffId,
        })),
      };
    });
  }

  /** Cross-tenant slug -> {store, tenant} lookup via the SECURITY DEFINER fn. */
  private async resolveStore(
    slug: string,
  ): Promise<{ storeId: string; tenantId: string }> {
    const [resolved] = await this.prisma.$queryRaw<
      Array<{ store_id: string; tenant_id: string }>
    >`SELECT store_id, tenant_id FROM resolve_store_by_slug(${slug})`;

    if (!resolved) {
      throw new NotFoundException('Store not found');
    }
    return { storeId: resolved.store_id, tenantId: resolved.tenant_id };
  }

  private asTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    const ctx: TenantContext = {
      tenantId,
      userId: PUBLIC_USER_ID,
      role: Role.CUSTOMER,
    };
    return runWithTenant(ctx, fn);
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
