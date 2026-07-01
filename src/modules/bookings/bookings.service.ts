import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { BookingListItemDto } from './dto/booking-list-item.dto';

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
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        service: { select: { name: true, priceCents: true } },
        staff: { select: { name: true } },
      },
    });

    return bookings.map((b) => ({
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
    }));
  }
}
