/**
 * @fileoverview Dummy email service for testing.
 * No-op implementation of IEmailService for development and testing.
 * @module services/dummy-email-service
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IApplication, IEmailService } from '../interfaces';

/**
 * Dummy email service that does nothing.
 * Primarily for testing and development environments.
 * @template TID - Platform ID type (defaults to Buffer)
 * @template TApplication - Application type (defaults to IApplication<TID>)
 */
export class DummyEmailService<
  TID extends PlatformID = Buffer,
  TApplication extends IApplication<TID> = IApplication<TID>,
> implements IEmailService {
  /**
   * Creates a new dummy email service.
   * @param {TApplication} _application - Application instance (unused)
   */
  constructor(_application: TApplication) {}

  /**
   * Sends an email (no-op implementation).
   * @param {string} _to - Recipient email address
   * @param {string} _subject - Email subject
   * @param {string} _text - Plain text body
   * @param {string} _html - HTML body
   * @returns {Promise<void>} Resolves immediately
   */
  public async sendEmail(
    _to: string,
    _subject: string,
    _text: string,
    _html: string,
  ): Promise<void> {
    // Do nothing
    return;
  }
}
