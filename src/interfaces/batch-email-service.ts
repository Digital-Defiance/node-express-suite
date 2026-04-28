/**
 * @fileoverview Optional batch capability extension for IEmailService.
 * Implementations that can deliver a single message to multiple recipients
 * in one transport call (e.g. AWS SES `SendEmail`, nodemailer multi-address
 * SMTP envelopes) should implement {@link IBatchEmailService}.
 * @module interfaces/batch-email-service
 */

import type { IEmailService } from './email-service';

/**
 * Input for sending an email to multiple recipients in a single transport
 * call. Addresses are passed through verbatim (RFC 5322 mailbox or
 * `Display Name <local@domain>` syntax). Empty arrays are permitted for
 * `cc` and `bcc`.
 */
export interface IEmailBatchInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html: string;
}

/**
 * Optional capability extension for {@link IEmailService} implementations
 * that can deliver a single message to multiple recipients in one transport
 * call. Implementations are responsible for honouring transport limits —
 * callers may pass arbitrarily long lists.
 *
 * Use {@link isBatchEmailService} to detect support at runtime.
 */
export interface IBatchEmailService extends IEmailService {
  sendEmailBatch(input: IEmailBatchInput): Promise<void>;
}

/**
 * Type guard: returns `true` when the email service implements the batch
 * extension and `sendEmailBatch` can be called safely.
 */
export function isBatchEmailService(
  service: IEmailService,
): service is IBatchEmailService {
  return (
    typeof (service as Partial<IBatchEmailService>).sendEmailBatch ===
    'function'
  );
}
