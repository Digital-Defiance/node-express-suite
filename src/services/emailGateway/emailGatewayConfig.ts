/**
 * Minimal Email Gateway configuration for Postfix SMTP connection.
 *
 * Reads values from environment variables with sensible defaults.
 * This is the express-suite version — it contains only the Postfix
 * connection fields needed by PostfixEmailService.
 *
 * @module services/emailGateway/emailGatewayConfig
 */

/**
 * Postfix SMTP connection configuration, read from environment variables.
 */
export interface IEmailGatewayConfig {
  /** Postfix MTA hostname. env: GATEWAY_POSTFIX_HOST. */
  postfixHost: string;
  /** Postfix MTA port. env: GATEWAY_POSTFIX_PORT. */
  postfixPort: number;
  /** Optional Postfix authentication credentials. env: GATEWAY_POSTFIX_USER / GATEWAY_POSTFIX_PASS. */
  postfixAuth?: { user: string; pass: string };
}

/**
 * Load Postfix connection configuration from environment variables.
 */
export function loadGatewayConfig(): IEmailGatewayConfig {
  const postfixUser = process.env['GATEWAY_POSTFIX_USER'];
  const postfixPass = process.env['GATEWAY_POSTFIX_PASS'];
  const portRaw = process.env['GATEWAY_POSTFIX_PORT'];
  const port = portRaw ? parseInt(portRaw, 10) : 25;

  return {
    postfixHost: process.env['GATEWAY_POSTFIX_HOST'] ?? 'localhost',
    postfixPort: Number.isNaN(port) ? 25 : port,
    postfixAuth:
      postfixUser && postfixPass
        ? { user: postfixUser, pass: postfixPass }
        : undefined,
  };
}
