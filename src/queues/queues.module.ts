import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { QUEUE_LOYALTY, QUEUE_NOTIFICATIONS } from './queue-names';

/** Parses a redis(s):// URL into BullMQ-compatible connection options. */
function redisConnectionFromUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

/**
 * BullMQ infrastructure. Phase 0 only stands up the plumbing: a shared Redis
 * connection and two registered queues with default retry/backoff conventions.
 * Processors (reminders, loyalty reconciliation) are added in later phases.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: redisConnectionFromUrl(config.redisUrl),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NOTIFICATIONS },
      { name: QUEUE_LOYALTY },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
