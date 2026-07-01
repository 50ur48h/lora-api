import { randomBytes } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma, Role } from '@prisma/client';
import { Queue } from 'bullmq';
import { DateTime } from 'luxon';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  JOB_BOOKING_CONFIRMATION,
  QUEUE_NOTIFICATIONS,
} from '../../queues/queue-names';
import {
  runWithTenant,
  type TenantContext,
} from '../../common/tenancy/tenant-context';
import type { AvailabilityResponseDto } from './dto/availability-response.dto';
import type { BookingResponseDto } from './dto/booking-response.dto';
import type { BookingTrackResponseDto } from './dto/booking-track-response.dto';
import type { CreateBookingDto } from './dto/create-booking.dto';
import type { PublicStoreResponseDto } from './dto/public-store-response.dto';
import {
  generateSlots,
  type AvailabilityWindow,
  type BusyInterval,
  type Slot,
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
  private readonly logger = new Logger(PublicService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NOTIFICATIONS) private readonly notifications: Queue,
  ) {}

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

      const slots = await this.computeSlots(
        storeId,
        store.timezone,
        service.durationMin,
        service.bufferMin,
        date,
      );

      return {
        date,
        slots: slots.map((s) => ({
          startAt: s.startAt.toISOString(),
          staffId: s.staffId,
        })),
      };
    });
  }

  /** Raw open slots for a service on a day (shared by availability + booking). */
  private async computeSlots(
    storeId: string,
    timezone: string,
    durationMin: number,
    bufferMin: number,
    date: string,
  ): Promise<Slot[]> {
    const staff = await this.prisma.scoped.staff.findMany({
      where: { storeId, active: true },
      select: { id: true },
    });
    const staffIds = staff.map((s) => s.id);
    if (staffIds.length === 0) {
      return [];
    }

    const availabilities = await this.prisma.scoped.availability.findMany({
      where: { staffId: { in: staffIds } },
      select: { staffId: true, weekday: true, startTime: true, endTime: true },
    });

    const day = DateTime.fromISO(date, { zone: timezone });
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

    return generateSlots({
      date,
      timezone,
      durationMin,
      bufferMin,
      stepMin: SLOT_STEP_MIN,
      windows,
      busy,
    });
  }

  /**
   * Creates a booking for an open slot. The slot is re-validated against live
   * availability, and a database exclusion constraint is the race-safe backstop
   * against concurrent double-booking.
   */
  async createBooking(
    slug: string,
    dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
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
        where: { id: dto.serviceId, storeId, active: true },
        select: {
          name: true,
          durationMin: true,
          bufferMin: true,
          priceCents: true,
        },
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }

      const staff = await this.prisma.scoped.staff.findFirst({
        where: { id: dto.staffId, storeId, active: true },
        select: { name: true },
      });
      if (!staff) {
        throw new NotFoundException('Staff not found');
      }

      const startAt = new Date(dto.startAt);
      const date = DateTime.fromJSDate(startAt)
        .setZone(store.timezone)
        .toISODate();
      if (
        Number.isNaN(startAt.getTime()) ||
        startAt.getTime() <= Date.now() ||
        !date
      ) {
        throw new ConflictException('Slot is not available');
      }

      const slots = await this.computeSlots(
        storeId,
        store.timezone,
        service.durationMin,
        service.bufferMin,
        date,
      );
      const isOpen = slots.some(
        (s) =>
          s.startAt.getTime() === startAt.getTime() &&
          s.staffId === dto.staffId,
      );
      if (!isOpen) {
        throw new ConflictException('Slot is not available');
      }

      const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
      const customer = await this.findOrCreateCustomer(tenantId, dto.customer);

      const booking = await this.createWithReference({
        tenantId,
        storeId,
        serviceId: dto.serviceId,
        staffId: dto.staffId,
        customerId: customer.id,
        startAt,
        endAt,
      });

      await this.enqueueConfirmation(booking.id, tenantId);

      return {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        serviceName: service.name,
        staffName: staff.name,
        priceCents: service.priceCents,
      };
    });
  }

  /** Best-effort enqueue of the booking confirmation (never blocks booking). */
  private async enqueueConfirmation(
    bookingId: string,
    tenantId: string,
  ): Promise<void> {
    try {
      await this.notifications.add(JOB_BOOKING_CONFIRMATION, {
        bookingId,
        tenantId,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue confirmation for booking ${bookingId}: ${String(err)}`,
      );
    }
  }

  private async findOrCreateCustomer(
    tenantId: string,
    input: CreateBookingDto['customer'],
  ): Promise<{ id: string }> {
    const existing = await this.prisma.scoped.customer.findFirst({
      where: { phone: input.phone },
      select: { id: true },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.scoped.customer.create({
      data: {
        tenantId,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
      },
      select: { id: true },
    });
  }

  /**
   * Creates a booking, generating a unique tracking reference and retrying on
   * the (astronomically rare) reference collision. Slot exclusion conflicts
   * surface as 409.
   */
  private async createWithReference(
    data: Omit<Prisma.BookingUncheckedCreateInput, 'reference'>,
  ): Promise<{
    id: string;
    reference: string;
    status: BookingStatus;
    startAt: Date;
    endAt: Date;
  }> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.scoped.booking.create({
          data: { ...data, reference: generateReference() },
          select: {
            id: true,
            reference: true,
            status: true,
            startAt: true,
            endAt: true,
          },
        });
      } catch (err) {
        if (isExclusionViolation(err)) {
          throw new ConflictException('Slot was just taken');
        }
        if (isReferenceCollision(err) && attempt < 4) {
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Public booking status lookup by reference (no auth). Resolves the tenant via
   * the SECURITY DEFINER function, then reads under that tenant's RLS context.
   */
  async trackBooking(reference: string): Promise<BookingTrackResponseDto> {
    const { bookingId, tenantId } =
      await this.resolveBookingByReference(reference);

    return this.asTenant(tenantId, async () => {
      const booking = await this.prisma.scoped.booking.findUnique({
        where: { id: bookingId },
        include: {
          service: { select: { name: true, priceCents: true } },
          staff: { select: { name: true } },
          store: { select: { name: true, slug: true, timezone: true } },
          customer: { select: { name: true } },
        },
      });
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      return {
        reference: booking.reference,
        status: booking.status,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        serviceName: booking.service.name,
        staffName: booking.staff.name,
        storeName: booking.store.name,
        storeSlug: booking.store.slug,
        timezone: booking.store.timezone,
        customerName: booking.customer.name,
        priceCents: booking.service.priceCents,
      };
    });
  }

  /** Cross-tenant reference -> {booking, tenant} lookup via the SECURITY DEFINER fn. */
  private async resolveBookingByReference(
    reference: string,
  ): Promise<{ bookingId: string; tenantId: string }> {
    const [resolved] = await this.prisma.$queryRaw<
      Array<{ booking_id: string; tenant_id: string }>
    >`SELECT booking_id, tenant_id FROM resolve_booking_by_reference(${reference})`;

    if (!resolved) {
      throw new NotFoundException('Booking not found');
    }
    return { bookingId: resolved.booking_id, tenantId: resolved.tenant_id };
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

/** Unambiguous alphabet (no I, L, O, 0, 1) for human-readable references. */
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REFERENCE_LENGTH = 8;

/** Generates a short, human-friendly, URL-safe booking reference. */
function generateReference(): string {
  const bytes = randomBytes(REFERENCE_LENGTH);
  let out = '';
  for (let i = 0; i < REFERENCE_LENGTH; i++) {
    out += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return out;
}

/** Detects a unique-constraint violation on the booking reference. */
function isReferenceCollision(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== 'P2002') return false;
  const target = err.meta?.target;
  const targetStr = Array.isArray(target) ? target.join(',') : String(target);
  return targetStr.includes('reference');
}

/** Detects the Postgres exclusion-constraint violation Prisma leaves unmapped. */
function isExclusionViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    /booking_no_overlap|exclusion constraint|23P01/.test(err.message)
  );
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
