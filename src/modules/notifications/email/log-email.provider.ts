import { Logger } from '@nestjs/common';
import type {
  EmailMessage,
  EmailProvider,
  EmailSendResult,
} from './email-provider';

/**
 * No-network fallback used when no email API key is configured and in tests.
 * Records what would have been sent instead of calling an external provider.
 */
export class LogEmailProvider implements EmailProvider {
  private readonly logger = new Logger(LogEmailProvider.name);

  send(message: EmailMessage): Promise<EmailSendResult> {
    this.logger.log(
      `[email:log] to=${message.to} subject="${message.subject}"`,
    );
    return Promise.resolve({});
  }
}
