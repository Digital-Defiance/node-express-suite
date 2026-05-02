/**
 * @fileoverview Service for TOTP (Time-based One-Time Password) operations.
 * Provides secret generation, provisioning URI construction, and code verification
 * using the otplib library (RFC 6238 compliant).
 * @module services/totp
 */

import { generateSecret, generateURI, verifySync } from 'otplib';

/**
 * Default TOTP time step in seconds (RFC 6238 standard).
 */
const TOTP_PERIOD_SECONDS = 30;

/**
 * Service for TOTP two-factor authentication operations.
 * Encapsulates secret generation, provisioning URI construction,
 * and code verification using otplib.
 */
export class TotpService {
  /**
   * Minimum number of bytes required for TOTP secret entropy (160 bits).
   */
  private static readonly MIN_SECRET_BYTES = 20;

  /**
   * Generate a cryptographically random TOTP secret with at least 160 bits (20 bytes) of entropy,
   * encoded as base32.
   * @returns A base32-encoded TOTP secret string
   */
  public generateSecret(): string {
    return generateSecret({ length: TotpService.MIN_SECRET_BYTES });
  }

  /**
   * Build an otpauth:// provisioning URI for QR code generation.
   * @param secret The base32-encoded TOTP secret
   * @param accountLabel The user's account label (e.g., email address)
   * @param issuer The application/issuer name displayed in authenticator apps
   * @returns A provisioning URI string conforming to the otpauth://totp/ scheme
   */
  public generateProvisioningUri(
    secret: string,
    accountLabel: string,
    issuer: string,
  ): string {
    return generateURI({
      secret,
      label: accountLabel,
      issuer,
    });
  }

  /**
   * Verify a 6-digit TOTP code against a secret.
   * Checks the current 30-second window and ±1 adjacent steps to tolerate clock skew.
   * Returns a boolean result; never throws for invalid codes.
   * @param secret The base32-encoded TOTP secret
   * @param code The 6-digit TOTP code string to verify
   * @returns True if the code is valid within the allowed time window, false otherwise
   */
  public verifyCode(secret: string, code: string): boolean {
    try {
      const result = verifySync({
        secret,
        token: code,
        epochTolerance: TOTP_PERIOD_SECONDS,
      });
      return result.valid;
    } catch {
      return false;
    }
  }
}
