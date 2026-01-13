/**
 * @fileoverview Email service interface for sending emails.
 * Defines contract for email delivery implementations.
 * @module interfaces/email-service
 */

/**
 * Email service interface for sending emails.
 * Implementations handle email delivery with text and HTML content.
 */
export interface IEmailService {
  /**
   * Sends an email with text and HTML content.
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject line
   * @param {string} text - Plain text email body
   * @param {string} html - HTML email body
   * @returns {Promise<void>} Resolves when email is sent
   */
  sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void>;
}
