import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotifChannel, NotifStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EMAIL_PROVIDER, type EmailProvider } from './email/email-provider';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
  ) {}

  /**
   * Composes and sends a booking confirmation, then records it. Email is sent
   * through the configured provider (Resend); WhatsApp/SMS is a future provider
   * and is currently recorded + logged only.
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

    const when = DateTime.fromJSDate(booking.startAt)
      .setZone(booking.store.timezone)
      .toFormat("cccc d LLLL 'at' h:mm a");
    const text =
      `Hi ${booking.customer.name}, your booking for ${booking.service.name} ` +
      `at ${booking.store.name} with ${booking.staff.name} is confirmed for ${when}.`;

    const email = booking.customer.email;
    const channel = email ? NotifChannel.EMAIL : NotifChannel.WHATSAPP;
    let status: NotifStatus = NotifStatus.SENT;

    if (email) {
      try {
        const result = await this.email.send({
          to: email,
          subject: `Booking confirmed — ${booking.store.name}`,
          text,
          html: confirmationHtml(booking.store.name, text),
        });
        this.logger.log(
          `[EMAIL] confirmation sent to ${email}` +
            (result.id ? ` (id=${result.id})` : ''),
        );
      } catch (err) {
        status = NotifStatus.FAILED;
        this.logger.error(
          `[EMAIL] confirmation failed for booking ${bookingId}: ${String(err)}`,
        );
      }
    } else {
      this.logger.log(`[WHATSAPP] ${text}`);
    }

    await this.prisma.scoped.notification.create({
      data: {
        tenantId: booking.tenantId,
        bookingId,
        channel,
        template: 'booking_confirmation',
        status,
        sentAt: status === NotifStatus.SENT ? new Date() : null,
      },
    });
  }
}

/** Minimal, email-client-safe HTML for the confirmation. Values are escaped. */
function confirmationHtml(storeName: string, body: string): string {
  return [
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c1c1c">',
    '<h1 style="font-size:18px;margin:0 0 16px">Booking confirmed</h1>',
    `<p style="font-size:15px;line-height:1.5;margin:0 0 16px">${escapeHtml(body)}</p>`,
    `<p style="font-size:13px;color:#6b7280;margin:24px 0 0">${escapeHtml(storeName)}</p>`,
    '</div>',
  ].join('');
}

/** Escapes the HTML-significant characters to prevent injection in emails. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
