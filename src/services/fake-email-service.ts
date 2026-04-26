/**
 * @fileoverview Fake email service for E2E and integration testing.
 * Captures outbound emails in-memory so tests can inspect sent messages
 * without depending on real email delivery infrastructure.
 * @module services/fake-email-service
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IApplication, IEmailService } from '../interfaces';

/**
 * Represents a captured email stored by the FakeEmailService.
 */
export interface CapturedEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  timestamp: Date;
}

/**
 * In-memory email service that captures sent emails for test inspection.
 * Implements IEmailService so it can be used as a drop-in replacement.
 * Uses a singleton pattern so routers and services access the same instance.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TApplication - Application type (defaults to IApplication<TID>)
 */
export class FakeEmailService<
  TID extends PlatformID = Buffer,
  TApplication extends IApplication<TID> = IApplication<TID>,
> implements IEmailService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static instance: FakeEmailService<any, any> | null = null;
  private readonly emails: Map<string, CapturedEmail[]> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_application: TApplication) {}

  /**
   * Returns the singleton FakeEmailService instance.
   * Creates it if it does not yet exist.
   */
  public static getInstance<
    TID extends PlatformID = Buffer,
    TApplication extends IApplication<TID> = IApplication<TID>,
  >(application?: TApplication): FakeEmailService<TID, TApplication> {
    if (!FakeEmailService.instance) {
      if (!application) {
        throw new Error(
          'FakeEmailService.getInstance() requires an application instance on first call',
        );
      }
      FakeEmailService.instance = new FakeEmailService<TID, TApplication>(
        application,
      );
    }
    return FakeEmailService.instance as FakeEmailService<TID, TApplication>;
  }

  /**
   * Resets the singleton instance. Useful for test teardown.
   */
  public static resetInstance(): void {
    FakeEmailService.instance = null;
  }

  /**
   * Captures an email in-memory instead of sending it.
   */
  public async sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    const email: CapturedEmail = {
      to,
      subject,
      text,
      html,
      timestamp: new Date(),
    };
    const existing = this.emails.get(to);
    if (existing) {
      existing.push(email);
    } else {
      this.emails.set(to, [email]);
    }
  }

  /**
   * Returns all captured emails for a given recipient address.
   */
  public getEmails(recipientAddress: string): CapturedEmail[] {
    return this.emails.get(recipientAddress) ?? [];
  }

  /**
   * Returns the most recently captured email for a given recipient address.
   */
  public getLatestEmail(recipientAddress: string): CapturedEmail | undefined {
    const list = this.emails.get(recipientAddress);
    if (!list || list.length === 0) return undefined;
    return list[list.length - 1];
  }

  /**
   * Returns all captured emails grouped by recipient address.
   */
  public getAllEmails(): Map<string, CapturedEmail[]> {
    return new Map(this.emails);
  }

  /**
   * Returns the list of all recipient addresses that have captured emails.
   */
  public getAllRecipients(): string[] {
    return Array.from(this.emails.keys());
  }

  /**
   * Removes all captured emails from the in-memory store.
   */
  public clear(): void {
    this.emails.clear();
  }

  /**
   * Parses a verification code or login token from email body content.
   * Looks for common patterns: 6-digit codes, UUID-style tokens, and
   * codes embedded in "code=XXX" or "verification code: XXX" patterns.
   */
  public extractCode(emailBody: string): string | null {
    const codeParamMatch = emailBody.match(/code[=:]\s*([A-Za-z0-9-]+)/i);
    if (codeParamMatch) return codeParamMatch[1];

    const verificationMatch = emailBody.match(
      /(?:verification\s+code|your\s+code\s+is)[:\s]+(\d{4,8})/i,
    );
    if (verificationMatch) return verificationMatch[1];

    const sixDigitMatch = emailBody.match(/\b(\d{6})\b/);
    if (sixDigitMatch) return sixDigitMatch[1];

    return null;
  }

  /**
   * Extracts a verification token from a verify-email link in the email body.
   */
  public extractVerificationToken(emailBody: string): string | null {
    const tokenMatch = emailBody.match(/verify-email\?token=([A-Fa-f0-9]+)/i);
    if (tokenMatch) return tokenMatch[1];
    return null;
  }
}
