/**
 * Property-Based Tests for TotpService
 *
 * Feature: totp-2fa
 * Uses fast-check to validate universal properties of the TOTP service
 * across many iterations.
 *
 * @module services/__tests__/totp.property.spec
 */

import * as fc from 'fast-check';
import { base32 } from '@scure/base';
import { generateSync } from 'otplib';

import { TotpService } from '../totp';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TotpService - Property Tests', () => {
  const totpService = new TotpService();

  // ─── Property 1: TOTP Secret Minimum Entropy ─────────────────────────────

  describe('Feature: totp-2fa, Property 1: TOTP Secret Minimum Entropy', () => {
    /**
     * **Validates: Requirements 2.1**
     *
     * For any generated TOTP secret, decoding it from base32 SHALL yield
     * at least 20 bytes (160 bits) of data.
     */
    it('every generated secret decodes to at least 20 bytes', () => {
      fc.assert(
        fc.property(
          // Use a simple arbitrary to drive iteration count; the secret
          // generation itself is non-deterministic (crypto-random), so
          // each run produces a fresh secret regardless of the input.
          fc.constant(null),
          () => {
            const secret = totpService.generateSecret();

            // Secret must be a non-empty base32 string
            expect(typeof secret).toBe('string');
            expect(secret.length).toBeGreaterThan(0);

            // Decode from base32 and verify minimum byte length
            const decoded = base32.decode(secret);
            expect(decoded.length).toBeGreaterThanOrEqual(20);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 2: Provisioning URI Validity ──────────────────────────────

  describe('Feature: totp-2fa, Property 2: Provisioning URI Validity', () => {
    /**
     * **Validates: Requirements 2.2**
     *
     * For any valid base32 secret, non-empty account label, and non-empty
     * issuer, the generated provisioning URI SHALL start with
     * `otpauth://totp/`, contain the issuer parameter, and contain the
     * account label.
     */

    // Arbitrary for non-empty alphanumeric strings (avoids special
    // characters that complicate URI encoding assertions).
    const alphanumChars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const nonEmptyAlphanumeric = fc
      .array(
        fc.constantFrom(...alphanumChars.split('')),
        { minLength: 1, maxLength: 30 },
      )
      .map((chars) => chars.join(''));

    it('provisioning URI starts with otpauth://totp/ and contains issuer and account label', () => {
      fc.assert(
        fc.property(
          nonEmptyAlphanumeric,
          nonEmptyAlphanumeric,
          (accountLabel, issuer) => {
            const secret = totpService.generateSecret();
            const uri = totpService.generateProvisioningUri(
              secret,
              accountLabel,
              issuer,
            );

            // URI must start with the otpauth TOTP scheme
            expect(uri.startsWith('otpauth://totp/')).toBe(true);

            // URI must contain the issuer (possibly URL-encoded)
            expect(uri).toContain(encodeURIComponent(issuer));

            // URI must contain the account label (possibly URL-encoded)
            expect(uri).toContain(encodeURIComponent(accountLabel));
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 3: TOTP Code Round-Trip ───────────────────────────────────

  describe('Feature: totp-2fa, Property 3: TOTP Code Round-Trip', () => {
    /**
     * **Validates: Requirements 2.3, 2.6**
     *
     * For any valid TOTP secret, generating a code from that secret at the
     * current timestamp and then verifying it against the same secret SHALL
     * return `true`.
     */
    it('generating a code and verifying it against the same secret returns true', () => {
      fc.assert(
        fc.property(
          // Use a simple arbitrary to drive iteration count; the secret
          // generation itself is non-deterministic (crypto-random), so
          // each run produces a fresh secret regardless of the input.
          fc.constant(null),
          () => {
            const secret = totpService.generateSecret();

            // Generate a valid TOTP code from the secret using otplib
            const code = generateSync({ secret });

            // The code must be a 6-digit string
            expect(code).toMatch(/^\d{6}$/);

            // Verifying the generated code against the same secret must return true
            const result = totpService.verifyCode(secret, code);
            expect(result).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 4: TOTP Verification Never Throws ─────────────────────────

  describe('Feature: totp-2fa, Property 4: TOTP Verification Never Throws', () => {
    /**
     * **Validates: Requirements 2.4, 2.7**
     *
     * For any valid TOTP secret and any 6-digit string, calling
     * `verifyCode(secret, code)` SHALL return a boolean value and
     * SHALL NOT throw an exception.
     */

    // Arbitrary for random 6-digit strings
    const sixDigitString = fc
      .array(fc.constantFrom(...'0123456789'.split('')), {
        minLength: 6,
        maxLength: 6,
      })
      .map((chars) => chars.join(''));

    it('verifyCode always returns a boolean and never throws for any 6-digit code', () => {
      fc.assert(
        fc.property(sixDigitString, (code) => {
          const secret = totpService.generateSecret();

          // Must not throw
          const result = totpService.verifyCode(secret, code);

          // Must return a boolean
          expect(typeof result).toBe('boolean');
        }),
        { numRuns: 100 },
      );
    });
  });
});
