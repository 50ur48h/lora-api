import { Module } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { EMAIL_PROVIDER, type EmailProvider } from './email/email-provider';
import { LogEmailProvider } from './email/log-email.provider';
import { ResendEmailProvider } from './email/resend-email.provider';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService } from './notifications.service';

/**
 * Booking notifications. A BullMQ worker (NotificationsProcessor) consumes the
 * `notifications` queue and records/sends confirmations via NotificationsService.
 * The email provider is picked at startup: Resend when an API key is configured
 * (outside tests), otherwise a log-only stub — so swapping in SendGrid/Twilio
 * later is a one-file change.
 */
@Module({
  providers: [
    NotificationsService,
    NotificationsProcessor,
    {
      provide: EMAIL_PROVIDER,
      useFactory: (config: AppConfigService): EmailProvider =>
        config.resendApiKey && config.nodeEnv !== 'test'
          ? new ResendEmailProvider(config.resendApiKey, config.emailFrom)
          : new LogEmailProvider(),
      inject: [AppConfigService],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
