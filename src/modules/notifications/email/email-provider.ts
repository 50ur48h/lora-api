/**
 * Transactional email abstraction. The concrete provider (Resend today) is
 * chosen at startup, so switching to SendGrid/Twilio later means adding one
 * class that implements this interface — nothing else changes.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  /** Provider-side message id, when the provider returns one. */
  id?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

/** DI token for the active email provider. */
export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
