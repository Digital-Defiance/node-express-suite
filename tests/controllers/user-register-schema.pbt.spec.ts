/**
 * Property-based tests for RegisterSchema Zod validation.
 *
 * Feature: user-provided-mnemonic, Property 1: RegisterSchema accepts optional mnemonic correctly
 *
 * The RegisterSchema is defined as a module-scoped const in controllers/user.ts
 * and is not exported. We recreate it here to test its validation behavior in isolation.
 *
 * **Validates: Requirements 1.1, 1.3**
 */

import * as fc from 'fast-check';
import { z } from 'zod';

/**
 * Mirror of the RegisterSchema from controllers/user.ts.
 * Kept in sync with the source definition.
 */
const RegisterSchema = z.object({
  username: z.string(),
  email: z.string(),
  timezone: z.string(),
  password: z.string().min(8).optional(),
  mnemonic: z.string().min(1).optional(),
});

/**
 * Arbitrary for generating valid base registration payloads (without mnemonic).
 */
const basePayloadArb = fc.record({
  username: fc.string({ minLength: 1 }),
  email: fc.string({ minLength: 1 }),
  timezone: fc.string({ minLength: 1 }),
});

/**
 * Arbitrary for generating non-empty mnemonic strings.
 */
const nonEmptyMnemonicArb = fc.string({ minLength: 1 });

describe('Feature: user-provided-mnemonic, Property 1: RegisterSchema accepts optional mnemonic correctly', () => {
  /**
   * Property 1a: RegisterSchema accepts payloads without a mnemonic field.
   * When the mnemonic field is absent, the schema should parse successfully.
   *
   * **Validates: Requirements 1.1**
   */
  it('should accept payloads without a mnemonic field', () => {
    fc.assert(
      fc.property(basePayloadArb, (payload) => {
        const result = RegisterSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.mnemonic).toBeUndefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1b: RegisterSchema accepts payloads with a non-empty string mnemonic.
   * When the mnemonic field is a non-empty string, the schema should parse successfully
   * and preserve the mnemonic value.
   *
   * **Validates: Requirements 1.1, 1.3**
   */
  it('should accept payloads with a non-empty string mnemonic', () => {
    fc.assert(
      fc.property(basePayloadArb, nonEmptyMnemonicArb, (base, mnemonic) => {
        const payload = { ...base, mnemonic };
        const result = RegisterSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.mnemonic).toBe(mnemonic);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1c: RegisterSchema rejects payloads with an empty string mnemonic.
   * When the mnemonic field is present but is an empty string, the schema should
   * reject the payload due to the min(1) constraint.
   *
   * **Validates: Requirements 1.3**
   */
  it('should reject payloads with an empty string mnemonic', () => {
    fc.assert(
      fc.property(basePayloadArb, (base) => {
        const payload = { ...base, mnemonic: '' };
        const result = RegisterSchema.safeParse(payload);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
