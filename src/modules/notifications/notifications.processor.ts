import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Job } from 'bullmq';
import { runWithTenant } from '../../common/tenancy/tenant-context';
import {
  JOB_BOOKING_CONFIRMATION,
  QUEUE_NOTIFICATIONS,
  type BookingNotificationJob,
} from '../../queues/queue-names';
import { NotificationsService } from './notifications.service';

const NOTIFICATIONS_USER_ID = '00000000-0000-0000-0000-000000000000';

@Processor(QUEUE_NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process(job: Job<BookingNotificationJob>): Promise<void> {
    if (job.name !== JOB_BOOKING_CONFIRMATION) {
      this.logger.warn(`Unhandled job '${job.name}'; ignoring`);
      return;
    }

    const { bookingId, tenantId } = job.data;
    await runWithTenant(
      { tenantId, userId: NOTIFICATIONS_USER_ID, role: Role.STAFF },
      () => this.notifications.sendBookingConfirmation(bookingId),
    );
  }
}
