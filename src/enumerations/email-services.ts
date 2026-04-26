/**
 * @fileoverview Email service backend selection enum.
 * Set via the EMAIL_SERVICE environment variable.
 * @module enumerations/email-services
 */

/**
 * Supported email service backends.
 *
 * - Dummy: no-op, silently discards all emails (good for CI/unit tests)
 * - Fake: in-memory capture for development/integration testing (exposes admin API)
 * - Postfix: send via a local Postfix SMTP relay
 * - SES: send via AWS Simple Email Service
 *
 * Postfix and SES require additional environment configuration and are
 * implemented by the consuming application. The base Application class
 * handles Dummy and Fake natively; other values are left for subclasses
 * to register via registerServices().
 */
export enum EmailServices {
  Dummy = 'DUMMY',
  Fake = 'FAKE',
  Postfix = 'POSTFIX',
  SES = 'SES',
}
