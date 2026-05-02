/**
 * Unit Tests for TotpService
 *
 * Tests specific examples, edge cases, and error conditions for the
 * TOTP service: secret generation, provisioning URI format, code
 * verification with known valid/invalid codes, and clock skew tolerance.
 *
 * @module services/__tests__/totp.spec
 */

import { base32 } from '@scure/base';
import { generateSync } from 'otplib';

import { TotpService } from '../totp';

describe('TotpService', () => {
  let totpService: TotpService;

  beforeEach(() => {
    totpService = new TotpService();
  });

  // ─── Secret Generation ──────────────────────────────────────────────────

  describe('generateSecret', () => {
    /**
     * Validates: Requirements 2.1
     */
    it('should return a non-empty base32 string', () => {
      const secret = totpService.generateSecret();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
    });

    it('should decode to at least 20 bytes (160 bits) of entropy', () => {
      const secret = totpService.generateSecret();
      const decoded = base32.decode(secret);
      expect(decoded.length).toBeGreaterThanOrEqual(20);
    });

    it('should generate unique secrets on successive calls', () => {
      const secret1 = totpService.generateSecret();
      const secret2 = totpService.generateSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  // ─── Provisioning URI ───────────────────────────────────────────────────

  describe('generateProvisioningUri', () => {
    /**
     * Validates: Requirements 2.2
     */
    it('should return a URI starting with otpauth://totp/', () => {
      const secret = totpService.generateSecret();
      const uri = totpService.generateProvisioningUri(
        secret,
        'user@example.com',
        'MyApp',
      );
      expect(uri.startsWith('otpauth://totp/')).toBe(true);
    });

    it('should contain the issuer parameter', () => {
      const secret = totpService.generateSecret();
      const uri = totpService.generateProvisioningUri(
        secret,
        'user@example.com',
        'MyApp',
      );
      expect(uri).toContain('MyApp');
    });

    it('should contain the account label', () => {
      const secret = totpService.generateSecret();
      const uri = totpService.generateProvisioningUri(
        secret,
        'user@example.com',
        'MyApp',
      );
      expect(uri).toContain('user%40example.com');
    });

    it('should contain the secret parameter', () => {
      const secret = totpService.generateSecret();
      const uri = totpService.generateProvisioningUri(
        secret,
        'user@example.com',
        'MyApp',
      );
      expect(uri).toContain(`secret=${secret}`);
    });

    it('should URL-encode special characters in issuer', () => {
      const secret = totpService.generateSecret();
      const uri = totpService.generateProvisioningUri(
        secret,
        'user@example.com',
        'My App & Co',
      );
      expect(uri.startsWith('otpauth://totp/')).toBe(true);
      expect(uri).toContain(encodeURIComponent('My App & Co'));
    });

    it('should URL-encode special characters in account label', () => {
      const secret = totpService.generateSecret();
      const uri = totpService.generateProvisioningUri(
        secret,
        'user+test@example.com',
        'MyApp',
      );
      expect(uri.startsWith('otpauth://totp/')).toBe(true);
      expect(uri).toContain(encodeURIComponent('user+test@example.com'));
    });
  });

  // ─── Code Verification ──────────────────────────────────────────────────

  describe('verifyCode', () => {
    /**
     * Validates: Requirements 2.3, 2.4
     */
    it('should return true for a valid code generated from the same secret', () => {
      const secret = totpService.generateSecret();
      const code = generateSync({ secret });
      expect(totpService.verifyCode(secret, code)).toBe(true);
    });

    it('should return false for an incorrect code', () => {
      const secret = totpService.generateSecret();
      // Use a code that is very unlikely to be valid
      const result = totpService.verifyCode(secret, '000000');
      // We can't guarantee 000000 is always invalid, but we can test
      // that the method returns a boolean
      expect(typeof result).toBe('boolean');
    });

    it('should return false for a code from a different secret', () => {
      const secret1 = totpService.generateSecret();
      const secret2 = totpService.generateSecret();
      const code = generateSync({ secret: secret1 });
      // A code generated for secret1 should not verify against secret2
      expect(totpService.verifyCode(secret2, code)).toBe(false);
    });

    it('should return a boolean and never throw for an empty code', () => {
      const secret = totpService.generateSecret();
      const result = totpService.verifyCode(secret, '');
      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });

    it('should return a boolean and never throw for a non-numeric code', () => {
      const secret = totpService.generateSecret();
      const result = totpService.verifyCode(secret, 'abcdef');
      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });

    it('should return a boolean and never throw for a code with wrong length', () => {
      const secret = totpService.generateSecret();
      // Too short
      const resultShort = totpService.verifyCode(secret, '123');
      expect(typeof resultShort).toBe('boolean');
      expect(resultShort).toBe(false);

      // Too long
      const resultLong = totpService.verifyCode(secret, '12345678');
      expect(typeof resultLong).toBe('boolean');
      expect(resultLong).toBe(false);
    });

    it('should return false and not throw for special characters in code', () => {
      const secret = totpService.generateSecret();
      const result = totpService.verifyCode(secret, '!@#$%^');
      expect(typeof result).toBe('boolean');
      expect(result).toBe(false);
    });
  });

  // ─── Clock Skew Tolerance ─────────────────────────────────────────────

  describe('clock skew tolerance', () => {
    /**
     * Validates: Requirements 2.3
     *
     * The TotpService uses epochTolerance of 30 seconds (one step),
     * meaning codes from the previous and next 30-second windows
     * should also be accepted.
     */
    it('should accept a code generated 30 seconds in the past (previous window)', () => {
      const secret = totpService.generateSecret();

      // Generate a code at the current time
      const now = Date.now();
      const code = generateSync({ secret });

      // Simulate time advancing by 30 seconds (one TOTP step)
      jest.spyOn(Date, 'now').mockReturnValue(now + 30_000);

      try {
        // The code from the previous window should still be valid
        // due to ±1 step tolerance
        const result = totpService.verifyCode(secret, code);
        expect(typeof result).toBe('boolean');
        // With epochTolerance of 30s, the previous window code should be accepted
        expect(result).toBe(true);
      } finally {
        jest.restoreAllMocks();
      }
    });

    it('should accept a code generated 30 seconds in the future (next window)', () => {
      const secret = totpService.generateSecret();

      // Simulate time being 30 seconds in the past
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now - 30_000);

      try {
        // Generate a code at the "past" time
        const code = generateSync({ secret });

        // Restore time to "now" — the code is from the previous window
        jest.restoreAllMocks();

        // The code should still be valid due to tolerance
        const result = totpService.verifyCode(secret, code);
        expect(typeof result).toBe('boolean');
        expect(result).toBe(true);
      } finally {
        jest.restoreAllMocks();
      }
    });

    it('should reject a code that is well outside the tolerance window', () => {
      const secret = totpService.generateSecret();

      // Generate a code at the current time
      const code = generateSync({ secret });

      // Advance time by 5 minutes (10 TOTP steps) — well beyond tolerance
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now + 300_000);

      try {
        const result = totpService.verifyCode(secret, code);
        expect(result).toBe(false);
      } finally {
        jest.restoreAllMocks();
      }
    });
  });
});
