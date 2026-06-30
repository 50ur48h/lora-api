/** Registered background queues. Processors are added in later phases. */
export const QUEUE_NOTIFICATIONS = 'notifications';
export const QUEUE_LOYALTY = 'loyalty';

export const ALL_QUEUES = [QUEUE_NOTIFICATIONS, QUEUE_LOYALTY] as const;
