/** Registered background queues. Processors are added in later phases. */
export const QUEUE_NOTIFICATIONS = 'notifications';
export const QUEUE_LOYALTY = 'loyalty';

export const ALL_QUEUES = [QUEUE_NOTIFICATIONS, QUEUE_LOYALTY] as const;

/** Job names for the notifications queue. */
export const JOB_BOOKING_CONFIRMATION = 'booking_confirmation';

export interface BookingNotificationJob {
  bookingId: string;
  tenantId: string;
}
