import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { BookingListItemDto } from './dto/booking-list-item.dto';

const BOOKING_INCLUDE = {
  customer: { select: { name: true, phone: true, email: true } },
  service: { select: { name: true, priceCents: true } },
  staff: { select: { name: true } },
} satisfies Prisma.BookingInclude;

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: typeof BOOKING_INCLUDE;
}>;

/** Allowed status transitions an admin can apply; terminal states have none. */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.REQUESTED]: [
    BookingStatus.CONFIRMED,
    BookingStatus.CANCELLED,
    BookingStatus.NO_SHOW,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.IN_PROGRESS,
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
    BookingStatus.NO_SHOW,
  ],
  [BookingStatus.IN_PROGRESS]: [
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.NO_SHOW]: [],
};

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists the current tenant's bookings, most recent first. Tenant scoping is
   * applied automatically by the Prisma extension from the request's tenant
   * context (set from the authenticated user), so this never leaks across
   * tenants even without an explicit `where`.
   */
  async list(): Promise<BookingListItemDto[]> {
    const bookings = await this.prisma.scoped.booking.findMany({
      orderBy: { startAt: 'desc' },
      take: 100,
      include: BOOKING_INCLUDE,
    });
    return bookings.map(toDto);
  }

  /**
   * Transitions a booking to a new status, enforcing the allowed state machine.
   * Cross-tenant rows are invisible (RLS), so an unknown id is a 404.
   */
  async updateStatus(
    id: string,
    status: BookingStatus,
  ): Promise<BookingListItemDto> {
    const existing = await this.prisma.scoped.booking.findFirst({
      where: { id },
      select: { status: true },
    });
    if (!existing) {
      throw new NotFoundException('Booking not found');
    }
    if (!TRANSITIONS[existing.status].includes(status)) {
      throw new ConflictException(
        `Cannot change a ${existing.status} booking to ${status}`,
      );
    }
    const updated = await this.prisma.scoped.booking.update({
      where: { id },
      data: { status },
      include: BOOKING_INCLUDE,
    });
    return toDto(updated);
  }
}

function toDto(b: BookingWithRelations): BookingListItemDto {
  return {
    id: b.id,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    status: b.status,
    serviceName: b.service.name,
    staffName: b.staff.name,
    customerName: b.customer.name,
    customerPhone: b.customer.phone,
    customerEmail: b.customer.email,
    priceCents: b.service.priceCents,
  };
}
