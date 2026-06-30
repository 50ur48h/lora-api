import { Injectable, Logger } from '@nestjs/common';
import { NotifChannel, NotifStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Composes and "sends" a booking confirmation, then records it. Sending is
   * currently a structured log plus a persisted Notification row; swapping in a
   * real WhatsApp/SMS/email provider is isolated to this method.
   *
   * Must run within the booking's tenant context (see NotificationsProcessor).
   */
  async sendBookingConfirmation(bookingId: string): Promise<void> {
    const booking = await this.prisma.scoped.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        service: { select: { name: true } },
        staff: { select: { name: true } },
        store: { select: { name: true, timezone: true } },
      },
    });
    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found; skipping confirmation`);
      return;
    }

    const channel = booking.customer.phone
      ? NotifChannel.WHATSAPP
      : NotifChannel.EMAIL;
    const when = DateTime.fromJSDate(booking.startAt)
      .setZone(booking.store.timezone)
      .toFormat("cccc d LLLL 'at' h:mm a");
    const message =
      `Hi ${booking.customer.name}, your booking for ${booking.service.name} ` +
      `at ${booking.store.name} with ${booking.staff.name} is confirmed for ${when}.`;

    await this.prisma.scoped.notification.create({
      data: {
        tenantId: booking.tenantId,
        bookingId,
        channel,
        template: 'booking_confirmation',
        status: NotifStatus.SENT,
        sentAt: new Date(),
      },
    });

    this.logger.log(`[${channel}] ${message}`);
  }
}
