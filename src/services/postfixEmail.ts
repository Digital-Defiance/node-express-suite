/**
 * @fileoverview Postfix email service for sending emails via local Postfix MTA.
 * Implements IEmailService interface for compatibility with the application's
 * email service abstraction.
 *
 * Uses nodemailer with SMTP transport to connect to a local or remote Postfix
 * server. Configuration is read from the email gateway config (environment variables).
 *
 * @module services/postfixEmail
 */

import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IApplication } from '../interfaces/application';
import {
  IBatchEmailService,
  IEmailBatchInput,
} from '../interfaces/batch-email-service';
import { IEmailService } from '../interfaces/email-service';
import { createTransport, Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { IPostfixEmailServiceConfig } from '../interfaces';
import {
  IEmailGatewayConfig,
  loadGatewayConfig,
} from './emailGateway/emailGatewayConfig';

/**
 * Debug logging helper.
 */
function debugLog(
  debug: boolean,
  type: 'log' | 'error' | 'warn',
  message: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): void {
  if (debug) {
    console[type](`[PostfixEmailService] ${message}`, ...args);
  }
}

/**
 * Email service implementation using Postfix MTA via SMTP.
 *
 * This service connects to a Postfix server (local or remote) to send emails.
 * It's designed as an alternative to SES for self-hosted deployments.
 *
 * @example
 * ```typescript
 * // Using with application context
 * const emailService = new PostfixEmailService(application);
 * await emailService.sendEmail(
 *   'user@example.com',
 *   'Welcome!',
 *   'Plain text body',
 *   '<h1>HTML body</h1>'
 * );
 *
 * // Using with explicit config
 * const emailService = PostfixEmailService.fromConfig({
 *   host: 'localhost',
 *   port: 25,
 *   emailSender: 'noreply@brightchain.org',
 * });
 * ```
 */
export class PostfixEmailService<TID extends PlatformID = Buffer>
  implements IEmailService, IBatchEmailService
{
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo>;
  private readonly emailSender: string;
  private readonly disableEmailSend: boolean;
  private readonly debug: boolean;

  /**
   * Constructs a PostfixEmailService using application context.
   *
   * Reads Postfix connection settings from the email gateway configuration
   * (environment variables) and email sender from the application environment.
   *
   * @param application - The application context containing environment config
   */
  constructor(application: IApplication<TID>) {
    const gatewayConfig: IEmailGatewayConfig = loadGatewayConfig();

    this.emailSender = application.environment.emailSender;
    this.disableEmailSend = application.environment.disableEmailSend;
    this.debug = application.environment.debug;

    this.transporter = createTransport({
      host: gatewayConfig.postfixHost,
      port: gatewayConfig.postfixPort,
      secure: false, // Postfix typically uses STARTTLS or plain on port 25
      auth: gatewayConfig.postfixAuth,
      connectionTimeout: 10000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false, // Allow self-signed certs for local Postfix
      },
    });
  }

  /**
   * Creates a PostfixEmailService with explicit configuration.
   *
   * Use this factory method when you need fine-grained control over the
   * Postfix connection settings or when not using the application context.
   *
   * @param config - Explicit configuration options
   * @returns A configured PostfixEmailService instance
   */
  public static fromConfig(
    config: IPostfixEmailServiceConfig,
  ): PostfixEmailService {
    const instance = Object.create(
      PostfixEmailService.prototype,
    ) as PostfixEmailService;

    // Use Object.defineProperty to set readonly fields
    Object.defineProperty(instance, 'emailSender', {
      value: config.emailSender,
      writable: false,
    });
    Object.defineProperty(instance, 'disableEmailSend', {
      value: config.disableEmailSend ?? false,
      writable: false,
    });
    Object.defineProperty(instance, 'debug', {
      value: config.debug ?? false,
      writable: false,
    });

    const transporter = createTransport({
      host: config.host ?? 'localhost',
      port: config.port ?? 25,
      secure: config.secure ?? false,
      auth: config.auth,
      connectionTimeout: config.connectionTimeout ?? 10000,
      socketTimeout: config.socketTimeout ?? 10000,
      ignoreTLS: config.ignoreTLS ?? true,
      tls: {
        rejectUnauthorized: false,
      },
    });

    Object.defineProperty(instance, 'transporter', {
      value: transporter,
      writable: false,
    });

    return instance;
  }

  /**
   * Sends an email via the Postfix SMTP server.
   *
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param text - Plain text body of the email
   * @param html - HTML body of the email
   * @returns Promise that resolves when the email is sent
   * @throws Error if email sending fails
   */
  public async sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    if (this.disableEmailSend) {
      debugLog(
        this.debug,
        'log',
        `Email sending disabled for: ${to} - Subject: ${subject}`,
      );
      return;
    }

    debugLog(
      this.debug,
      'log',
      `Sending email to ${to} with subject: ${subject}`,
    );

    try {
      const info = await this.transporter.sendMail({
        from: this.emailSender,
        to,
        subject,
        text,
        html,
      });

      debugLog(
        this.debug,
        'log',
        `Email sent successfully to ${to}, messageId: ${info.messageId}`,
      );
    } catch (error) {
      console.error(
        `[PostfixEmailService] Failed to send email to ${to}:`,
        error,
      );
      throw new Error(
        `Failed to send email via Postfix: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Sends a single message to multiple recipients in one SMTP transaction.
   * Nodemailer natively supports `to`/`cc`/`bcc` arrays, preserving RFC 5322
   * To/CC visibility while keeping BCC recipients hidden. SMTP itself has no
   * hard recipient cap (Postfix's `smtpd_recipient_limit` defaults to 1000),
   * so this method passes the lists through verbatim.
   *
   * @param input - Recipient lists and message bodies
   * @returns Promise that resolves when the email has been handed to Postfix
   * @throws Error if delivery fails
   */
  public async sendEmailBatch(input: IEmailBatchInput): Promise<void> {
    const to = input.to;
    const cc = input.cc ?? [];
    const bcc = input.bcc ?? [];

    if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
      return;
    }

    if (this.disableEmailSend) {
      debugLog(
        this.debug,
        'log',
        `Email sending disabled for batch (to=${to.length}, cc=${cc.length}, bcc=${bcc.length}) - Subject: ${input.subject}`,
      );
      return;
    }

    debugLog(
      this.debug,
      'log',
      `Sending batch email (to=${to.length}, cc=${cc.length}, bcc=${bcc.length}) with subject: ${input.subject}`,
    );

    try {
      const info = await this.transporter.sendMail({
        from: this.emailSender,
        to: to.length > 0 ? to : undefined,
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });

      debugLog(
        this.debug,
        'log',
        `Batch email sent successfully, messageId: ${info.messageId}`,
      );
    } catch (error) {
      console.error(
        `[PostfixEmailService] Failed to send batch email (to=${to.length}, cc=${cc.length}, bcc=${bcc.length}):`,
        error,
      );
      throw new Error(
        `Failed to send batch email via Postfix: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Verifies the SMTP connection to Postfix.
   *
   * Useful for health checks and startup validation.
   *
   * @returns Promise that resolves to true if connection is successful
   * @throws Error if connection verification fails
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      debugLog(this.debug, 'log', 'Postfix SMTP connection verified');
      return true;
    } catch (error) {
      debugLog(
        this.debug,
        'error',
        'Postfix SMTP connection verification failed:',
        error,
      );
      throw new Error(
        `Postfix connection verification failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Closes the SMTP connection pool.
   *
   * Call this when shutting down the service to clean up resources.
   */
  public close(): void {
    this.transporter.close();
    debugLog(this.debug, 'log', 'Postfix SMTP connection closed');
  }
}
