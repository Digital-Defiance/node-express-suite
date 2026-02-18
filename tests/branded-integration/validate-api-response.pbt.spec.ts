/**
 * Property-based tests for validateApiResponse equivalence.
 *
 * Feature: branded-api-responses, Property 3: validateApiResponse equivalence
 *
 * For any response object and for any branded API response definition,
 * `validateApiResponse(response, definition)` should return the same result
 * (success/failure and value/error) as calling `safeParseInterface(response, definition)` directly.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 */

import * as fc from 'fast-check';
import {
  resetInterfaceRegistry,
  safeParseInterface,
} from '@digitaldefiance/branded-interface';
import type { BrandedInterfaceDefinition } from '@digitaldefiance/branded-interface';
import { validateApiResponse } from '../../src/branded-responses/validate-api-response';
import {
  BrandedApiMessageResponse,
  BrandedApiErrorResponse,
  BrandedApiTokenResponse,
  BrandedApiLoginResponse,
  BrandedApiRegistrationResponse,
  BrandedApiChallengeResponse,
  BrandedApiMnemonicResponse,
  BrandedApiBackupCodesResponse,
  BrandedApiCodeCountResponse,
  BrandedApiRequestUserResponse,
  BrandedApiUserSettingsResponse,
  BrandedApiExpressValidationErrorResponse,
  BrandedApiMongoValidationErrorResponse,
  BrandedStatusCodeResponse,
  BrandedFailableResult,
} from '../../src/branded-responses/branded-api-responses';

// =============================================================================
// All definitions array for random selection
// =============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
const allDefinitions: BrandedInterfaceDefinition<any>[] = [
  BrandedApiMessageResponse,
  BrandedApiErrorResponse,
  BrandedApiTokenResponse,
  BrandedApiLoginResponse,
  BrandedApiRegistrationResponse,
  BrandedApiChallengeResponse,
  BrandedApiMnemonicResponse,
  BrandedApiBackupCodesResponse,
  BrandedApiCodeCountResponse,
  BrandedApiRequestUserResponse,
  BrandedApiUserSettingsResponse,
  BrandedApiExpressValidationErrorResponse,
  BrandedApiMongoValidationErrorResponse,
  BrandedStatusCodeResponse,
  BrandedFailableResult,
];
/* eslint-enable @typescript-eslint/no-explicit-any */

// =============================================================================
// Generators
// =============================================================================

/** Pick a random definition from the full set. */
const definitionArb = fc.constantFrom(...allDefinitions);

/** Generate random plain objects to use as response candidates. */
const randomObjectArb: fc.Arbitrary<Record<string, unknown>> = fc.oneof(
  fc.dictionary(fc.string(), fc.anything()),
  // Also include objects that look like valid responses to exercise success paths
  fc.record({
    message: fc.oneof(
      fc.string({ minLength: 1 }),
      fc.string(),
      fc.constant(''),
    ),
  }),
  fc.record({
    message: fc.string({ minLength: 1 }),
    token: fc.string({ minLength: 1 }),
  }),
  fc.record({
    message: fc.string({ minLength: 1 }),
    success: fc.boolean(),
  }),
  fc.record({
    message: fc.string({ minLength: 1 }),
    error: fc.dictionary(fc.string(), fc.anything()),
  }),
);

// =============================================================================
// Tests
// =============================================================================

describe('Feature: branded-api-responses, Property 3: validateApiResponse equivalence', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  afterEach(() => {
    resetInterfaceRegistry();
  });

  /**
   * Property 3: For any random object and any definition, validateApiResponse
   * returns the same success/failure result as safeParseInterface.
   *
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  it('Property 3: validateApiResponse returns same success/failure as safeParseInterface for random objects', () => {
    fc.assert(
      fc.property(randomObjectArb, definitionArb, (obj, definition) => {
        const wrapperResult = validateApiResponse(obj, definition);
        const directResult = safeParseInterface(obj, definition);

        // Both must agree on success/failure
        expect(wrapperResult.success).toBe(directResult.success);

        if (wrapperResult.success && directResult.success) {
          // On success, both return branded instances with the same enumerable properties
          const wrapperKeys = Object.keys(wrapperResult.value).sort();
          const directKeys = Object.keys(directResult.value).sort();
          expect(wrapperKeys).toEqual(directKeys);

          for (const key of wrapperKeys) {
            expect(
              (wrapperResult.value as Record<string, unknown>)[key],
            ).toEqual((directResult.value as Record<string, unknown>)[key]);
          }
        }

        if (!wrapperResult.success && !directResult.success) {
          // On failure, both return the same error code and message
          expect(wrapperResult.error.code).toBe(directResult.error.code);
          expect(wrapperResult.error.message).toBe(directResult.error.message);

          // Field errors should match when present
          if (directResult.error.fieldErrors) {
            expect(wrapperResult.error.fieldErrors).toEqual(
              directResult.error.fieldErrors,
            );
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property 3: For any random non-object input and any definition,
   * validateApiResponse returns the same failure as safeParseInterface.
   *
   * **Validates: Requirements 7.1, 7.3**
   */
  it('Property 3: validateApiResponse returns same failure as safeParseInterface for non-object inputs', () => {
    const nonObjectArb: fc.Arbitrary<unknown> = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.float(),
    );

    fc.assert(
      fc.property(nonObjectArb, definitionArb, (input, definition) => {
        const wrapperResult = validateApiResponse(input, definition);
        const directResult = safeParseInterface(input, definition);

        expect(wrapperResult.success).toBe(directResult.success);
        expect(wrapperResult.success).toBe(false);

        if (!wrapperResult.success && !directResult.success) {
          expect(wrapperResult.error.code).toBe(directResult.error.code);
          expect(wrapperResult.error.message).toBe(directResult.error.message);
        }
      }),
      { numRuns: 100 },
    );
  });
});
