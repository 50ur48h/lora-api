import { Module } from '@nestjs/common';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';

/**
 * Booking notifications. A BullMQ worker (NotificationsProcessor) consumes the
 * `notifications` queue and records/sends confirmations via NotificationsService.
 */
@Module({
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
