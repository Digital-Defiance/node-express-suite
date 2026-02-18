/**
 * Property-based tests for branded API response definition validation correctness.
 *
 * Feature: branded-api-responses, Property 1: Branded definition validation correctness
 *
 * For each definition, generate valid objects (all fields pass validators) and
 * invalid objects (one field fails) and verify safeParseInterface returns the
 * correct success/failure result.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4**
 */

import * as fc from 'fast-check';
import {
  resetInterfaceRegistry,
  safeParseInterface,
} from '@digitaldefiance/branded-interface';
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
// Shared Generators
// =============================================================================

/** Non-empty string arbitrary. */
const nonEmptyStringArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1 })
  .filter((s) => s.length > 0);

/** Non-null plain object arbitrary. */
const nonNullObjectArb: fc.Arbitrary<Record<string, unknown>> = fc
  .dictionary(fc.string(), fc.anything())
  .filter((o) => typeof o === 'object' && o !== null && !Array.isArray(o));

/** Non-empty string array arbitrary. */
const nonEmptyStringArrayArb: fc.Arbitrary<string[]> = fc.array(fc.string(), {
  minLength: 1,
});

/** Non-negative integer arbitrary. */
const nonNegativeIntArb: fc.Arbitrary<number> = fc.nat();

/** Positive integer arbitrary. */
const positiveIntArb: fc.Arbitrary<number> = fc.integer({ min: 1 });

/** Invalid non-empty-string values: empty string or non-string types. */
const invalidNonEmptyStringArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.constant(''),
  fc.constant(0),
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(false),
  fc.constant([]),
);

/** Invalid non-null-object values. */
const invalidNonNullObjectArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.constant(null),
  fc.constant('string'),
  fc.constant(42),
  fc.constant(true),
  fc.array(fc.anything()),
  fc.constant(undefined),
);

// =============================================================================
// Per-Definition Valid Object Generators
// =============================================================================

const validApiMessageResponseArb = fc.record({
  message: nonEmptyStringArb,
});

const validApiErrorResponseArb = fc.record({
  message: nonEmptyStringArb,
  error: nonNullObjectArb,
});

const validApiTokenResponseArb = fc.record({
  message: nonEmptyStringArb,
  token: nonEmptyStringArb,
});

const validApiLoginResponseArb = fc.record({
  message: nonEmptyStringArb,
  token: nonEmptyStringArb,
  serverPublicKey: fc.string(),
  user: nonNullObjectArb,
});

const validApiRegistrationResponseArb = fc.record({
  message: nonEmptyStringArb,
  mnemonic: nonEmptyStringArb,
  backupCodes: nonEmptyStringArrayArb,
});

const validApiChallengeResponseArb = fc.record({
  message: nonEmptyStringArb,
  challenge: nonEmptyStringArb,
  serverPublicKey: nonEmptyStringArb,
});

const validApiMnemonicResponseArb = fc.record({
  message: nonEmptyStringArb,
  mnemonic: nonEmptyStringArb,
});

const validApiBackupCodesResponseArb = fc.record({
  message: nonEmptyStringArb,
  backupCodes: nonEmptyStringArrayArb,
});

const validApiCodeCountResponseArb = fc.record({
  message: nonEmptyStringArb,
  codeCount: nonNegativeIntArb,
});

const validApiRequestUserResponseArb = fc.record({
  message: nonEmptyStringArb,
  user: nonNullObjectArb,
});

const validUserSettingsArb = fc.record({
  email: nonEmptyStringArb,
  timezone: nonEmptyStringArb,
  currency: nonEmptyStringArb,
  siteLanguage: nonEmptyStringArb,
  darkMode: fc.boolean(),
  directChallenge: fc.boolean(),
});

const validApiUserSettingsResponseArb = fc.record({
  message: nonEmptyStringArb,
  settings: validUserSettingsArb,
});

const validApiExpressValidationErrorResponseArb = fc.record({
  message: nonEmptyStringArb,
  errors: fc.array(fc.anything(), { minLength: 1 }),
});

const validApiMongoValidationErrorResponseArb = fc.record({
  message: nonEmptyStringArb,
  errors: nonNullObjectArb,
});

const validStatusCodeResponseArb = fc.record({
  statusCode: positiveIntArb,
  response: nonNullObjectArb,
});

const validFailableResultArb = fc.record({
  success: fc.boolean(),
});

// =============================================================================
// Tests
// =============================================================================

describe('Feature: branded-api-responses, Property 1: Branded definition validation correctness', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  afterEach(() => {
    resetInterfaceRegistry();
  });

  // ---------------------------------------------------------------------------
  // 1. BrandedApiMessageResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiMessageResponse objects pass safeParseInterface.
   * **Validates: Requirements 1.1, 1.4**
   */
  it('Property 1: valid ApiMessageResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiMessageResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedApiMessageResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiMessageResponse with invalid message fails safeParseInterface.
   * **Validates: Requirements 1.1, 1.5**
   */
  it('Property 1: ApiMessageResponse with invalid message fails validation', () => {
    fc.assert(
      fc.property(invalidNonEmptyStringArb, (badMessage) => {
        const result = safeParseInterface(
          { message: badMessage },
          BrandedApiMessageResponse,
        );
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 2. BrandedApiErrorResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiErrorResponse objects pass safeParseInterface.
   * **Validates: Requirements 1.2, 1.4**
   */
  it('Property 1: valid ApiErrorResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiErrorResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedApiErrorResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiErrorResponse with invalid message fails safeParseInterface.
   * **Validates: Requirements 1.2, 1.5**
   */
  it('Property 1: ApiErrorResponse with invalid message fails validation', () => {
    fc.assert(
      fc.property(
        validApiErrorResponseArb,
        invalidNonEmptyStringArb,
        (base, badMessage) => {
          const result = safeParseInterface(
            { ...base, message: badMessage },
            BrandedApiErrorResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiErrorResponse with invalid error field fails safeParseInterface.
   * **Validates: Requirements 1.2, 1.5**
   */
  it('Property 1: ApiErrorResponse with invalid error field fails validation', () => {
    fc.assert(
      fc.property(
        validApiErrorResponseArb,
        invalidNonNullObjectArb,
        (base, badError) => {
          const result = safeParseInterface(
            { ...base, error: badError },
            BrandedApiErrorResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 3. BrandedApiTokenResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiTokenResponse objects pass safeParseInterface.
   * **Validates: Requirements 1.3, 1.4**
   */
  it('Property 1: valid ApiTokenResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiTokenResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedApiTokenResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiTokenResponse with invalid token fails safeParseInterface.
   * **Validates: Requirements 1.3, 1.5**
   */
  it('Property 1: ApiTokenResponse with invalid token fails validation', () => {
    fc.assert(
      fc.property(
        validApiTokenResponseArb,
        invalidNonEmptyStringArb,
        (base, badToken) => {
          const result = safeParseInterface(
            { ...base, token: badToken },
            BrandedApiTokenResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 4. BrandedApiLoginResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiLoginResponse objects pass safeParseInterface.
   * **Validates: Requirements 2.1**
   */
  it('Property 1: valid ApiLoginResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiLoginResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedApiLoginResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiLoginResponse with invalid user fails safeParseInterface.
   * **Validates: Requirements 2.1**
   */
  it('Property 1: ApiLoginResponse with invalid user fails validation', () => {
    fc.assert(
      fc.property(
        validApiLoginResponseArb,
        invalidNonNullObjectArb,
        (base, badUser) => {
          const result = safeParseInterface(
            { ...base, user: badUser },
            BrandedApiLoginResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 5. BrandedApiRegistrationResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiRegistrationResponse objects pass safeParseInterface.
   * **Validates: Requirements 2.2**
   */
  it('Property 1: valid ApiRegistrationResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiRegistrationResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedApiRegistrationResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiRegistrationResponse with invalid backupCodes fails safeParseInterface.
   * **Validates: Requirements 2.2**
   */
  it('Property 1: ApiRegistrationResponse with invalid backupCodes fails validation', () => {
    const invalidBackupCodesArb: fc.Arbitrary<unknown> = fc.oneof(
      fc.constant([]),
      fc.constant(null),
      fc.constant('not-array'),
      fc.constant([1, 2, 3]),
    );

    fc.assert(
      fc.property(
        validApiRegistrationResponseArb,
        invalidBackupCodesArb,
        (base, badCodes) => {
          const result = safeParseInterface(
            { ...base, backupCodes: badCodes },
            BrandedApiRegistrationResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 6. BrandedApiChallengeResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiChallengeResponse objects pass safeParseInterface.
   * **Validates: Requirements 2.3**
   */
  it('Property 1: valid ApiChallengeResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiChallengeResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedApiChallengeResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiChallengeResponse with invalid serverPublicKey fails safeParseInterface.
   * **Validates: Requirements 2.3**
   */
  it('Property 1: ApiChallengeResponse with invalid serverPublicKey fails validation', () => {
    fc.assert(
      fc.property(
        validApiChallengeResponseArb,
        invalidNonEmptyStringArb,
        (base, badKey) => {
          const result = safeParseInterface(
            { ...base, serverPublicKey: badKey },
            BrandedApiChallengeResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 7. BrandedApiMnemonicResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiMnemonicResponse objects pass safeParseInterface.
   * **Validates: Requirements 2.4**
   */
  it('Property 1: valid ApiMnemonicResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiMnemonicResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedApiMnemonicResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiMnemonicResponse with invalid mnemonic fails safeParseInterface.
   * **Validates: Requirements 2.4**
   */
  it('Property 1: ApiMnemonicResponse with invalid mnemonic fails validation', () => {
    fc.assert(
      fc.property(
        validApiMnemonicResponseArb,
        invalidNonEmptyStringArb,
        (base, badMnemonic) => {
          const result = safeParseInterface(
            { ...base, mnemonic: badMnemonic },
            BrandedApiMnemonicResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 8. BrandedApiBackupCodesResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiBackupCodesResponse objects pass safeParseInterface.
   * **Validates: Requirements 2.5**
   */
  it('Property 1: valid ApiBackupCodesResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiBackupCodesResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedApiBackupCodesResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiBackupCodesResponse with invalid backupCodes fails safeParseInterface.
   * **Validates: Requirements 2.5**
   */
  it('Property 1: ApiBackupCodesResponse with invalid backupCodes fails validation', () => {
    const invalidBackupCodesArb: fc.Arbitrary<unknown> = fc.oneof(
      fc.constant([]),
      fc.constant(null),
      fc.constant('not-array'),
      fc.constant([1, 2, 3]),
    );

    fc.assert(
      fc.property(
        validApiBackupCodesResponseArb,
        invalidBackupCodesArb,
        (base, badCodes) => {
          const result = safeParseInterface(
            { ...base, backupCodes: badCodes },
            BrandedApiBackupCodesResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 9. BrandedApiCodeCountResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiCodeCountResponse objects pass safeParseInterface.
   * **Validates: Requirements 2.6**
   */
  it('Property 1: valid ApiCodeCountResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiCodeCountResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedApiCodeCountResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiCodeCountResponse with invalid codeCount fails safeParseInterface.
   * **Validates: Requirements 2.6**
   */
  it('Property 1: ApiCodeCountResponse with invalid codeCount fails validation', () => {
    const invalidCodeCountArb: fc.Arbitrary<unknown> = fc.oneof(
      fc.constant(-1),
      fc.constant(1.5),
      fc.constant('not-a-number'),
      fc.constant(null),
      fc.constant(NaN),
      fc.constant(Infinity),
    );

    fc.assert(
      fc.property(
        validApiCodeCountResponseArb,
        invalidCodeCountArb,
        (base, badCount) => {
          const result = safeParseInterface(
            { ...base, codeCount: badCount },
            BrandedApiCodeCountResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 10. BrandedApiRequestUserResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiRequestUserResponse objects pass safeParseInterface.
   * **Validates: Requirements 2.7**
   */
  it('Property 1: valid ApiRequestUserResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiRequestUserResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedApiRequestUserResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiRequestUserResponse with invalid user fails safeParseInterface.
   * **Validates: Requirements 2.7**
   */
  it('Property 1: ApiRequestUserResponse with invalid user fails validation', () => {
    fc.assert(
      fc.property(
        validApiRequestUserResponseArb,
        invalidNonNullObjectArb,
        (base, badUser) => {
          const result = safeParseInterface(
            { ...base, user: badUser },
            BrandedApiRequestUserResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 11. BrandedApiUserSettingsResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiUserSettingsResponse objects pass safeParseInterface.
   * **Validates: Requirements 2.8**
   */
  it('Property 1: valid ApiUserSettingsResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiUserSettingsResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedApiUserSettingsResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiUserSettingsResponse with invalid settings fails safeParseInterface.
   * **Validates: Requirements 2.8**
   */
  it('Property 1: ApiUserSettingsResponse with invalid settings fails validation', () => {
    const invalidSettingsArb: fc.Arbitrary<unknown> = fc.oneof(
      fc.constant(null),
      fc.constant('not-object'),
      fc.constant({}),
      fc.constant({
        email: '',
        timezone: 'UTC',
        currency: 'USD',
        siteLanguage: 'en',
        darkMode: true,
        directChallenge: false,
      }),
      fc.constant({
        email: 'a@b.c',
        timezone: 'UTC',
        currency: 'USD',
        siteLanguage: 'en',
        darkMode: 'yes',
        directChallenge: false,
      }),
    );

    fc.assert(
      fc.property(
        validApiUserSettingsResponseArb,
        invalidSettingsArb,
        (base, badSettings) => {
          const result = safeParseInterface(
            { ...base, settings: badSettings },
            BrandedApiUserSettingsResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 12. BrandedApiExpressValidationErrorResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiExpressValidationErrorResponse objects pass safeParseInterface.
   * **Validates: Requirements 3.1, 3.3**
   */
  it('Property 1: valid ApiExpressValidationErrorResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiExpressValidationErrorResponseArb, (obj) => {
        const result = safeParseInterface(
          obj,
          BrandedApiExpressValidationErrorResponse,
        );
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiExpressValidationErrorResponse with invalid errors fails safeParseInterface.
   * **Validates: Requirements 3.1, 3.3**
   */
  it('Property 1: ApiExpressValidationErrorResponse with invalid errors fails validation', () => {
    const invalidErrorsArb: fc.Arbitrary<unknown> = fc.oneof(
      fc.constant([]),
      fc.constant(null),
      fc.constant('not-array'),
      fc.constant(42),
    );

    fc.assert(
      fc.property(
        validApiExpressValidationErrorResponseArb,
        invalidErrorsArb,
        (base, badErrors) => {
          const result = safeParseInterface(
            { ...base, errors: badErrors },
            BrandedApiExpressValidationErrorResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 13. BrandedApiMongoValidationErrorResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid ApiMongoValidationErrorResponse objects pass safeParseInterface.
   * **Validates: Requirements 3.2, 3.3**
   */
  it('Property 1: valid ApiMongoValidationErrorResponse objects pass validation', () => {
    fc.assert(
      fc.property(validApiMongoValidationErrorResponseArb, (obj) => {
        const result = safeParseInterface(
          obj,
          BrandedApiMongoValidationErrorResponse,
        );
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: ApiMongoValidationErrorResponse with invalid errors fails safeParseInterface.
   * **Validates: Requirements 3.2, 3.3**
   */
  it('Property 1: ApiMongoValidationErrorResponse with invalid errors fails validation', () => {
    fc.assert(
      fc.property(
        validApiMongoValidationErrorResponseArb,
        invalidNonNullObjectArb,
        (base, badErrors) => {
          const result = safeParseInterface(
            { ...base, errors: badErrors },
            BrandedApiMongoValidationErrorResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 14. BrandedStatusCodeResponse
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid StatusCodeResponse objects pass safeParseInterface.
   * **Validates: Requirements 4.1, 4.2**
   */
  it('Property 1: valid StatusCodeResponse objects pass validation', () => {
    fc.assert(
      fc.property(validStatusCodeResponseArb, (obj) => {
        const result = safeParseInterface(obj, BrandedStatusCodeResponse);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: StatusCodeResponse with optional valid headers passes safeParseInterface.
   * **Validates: Requirements 4.2**
   */
  it('Property 1: StatusCodeResponse with valid headers passes validation', () => {
    fc.assert(
      fc.property(
        validStatusCodeResponseArb,
        nonNullObjectArb,
        (base, headers) => {
          const result = safeParseInterface(
            { ...base, headers },
            BrandedStatusCodeResponse,
          );
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: StatusCodeResponse with invalid statusCode fails safeParseInterface.
   * **Validates: Requirements 4.3**
   */
  it('Property 1: StatusCodeResponse with invalid statusCode fails validation', () => {
    const invalidStatusCodeArb: fc.Arbitrary<unknown> = fc.oneof(
      fc.constant(0),
      fc.constant(-1),
      fc.constant(1.5),
      fc.constant('200'),
      fc.constant(null),
      fc.constant(NaN),
      fc.constant(Infinity),
    );

    fc.assert(
      fc.property(
        validStatusCodeResponseArb,
        invalidStatusCodeArb,
        (base, badCode) => {
          const result = safeParseInterface(
            { ...base, statusCode: badCode },
            BrandedStatusCodeResponse,
          );
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ---------------------------------------------------------------------------
  // 15. BrandedFailableResult
  // ---------------------------------------------------------------------------

  /**
   * Property 1: Valid FailableResult objects pass safeParseInterface.
   * **Validates: Requirements 5.1**
   */
  it('Property 1: valid FailableResult objects pass validation', () => {
    fc.assert(
      fc.property(validFailableResultArb, (obj) => {
        const result = safeParseInterface(obj, BrandedFailableResult);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: FailableResult with optional data/message/error passes safeParseInterface.
   * **Validates: Requirements 5.2, 5.3, 5.4**
   */
  it('Property 1: FailableResult with optional fields passes validation', () => {
    const failableWithOptionalsArb = fc
      .record({
        success: fc.boolean(),
        data: fc.option(nonNullObjectArb, { nil: undefined }),
        message: fc.option(fc.string(), { nil: undefined }),
        error: fc.option(nonNullObjectArb, { nil: undefined }),
      })
      .map((rec) => {
        const obj: Record<string, unknown> = { success: rec.success };
        if (rec.data !== undefined) obj['data'] = rec.data;
        if (rec.message !== undefined) obj['message'] = rec.message;
        if (rec.error !== undefined) obj['error'] = rec.error;
        return obj;
      });

    fc.assert(
      fc.property(failableWithOptionalsArb, (obj) => {
        const result = safeParseInterface(obj, BrandedFailableResult);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1: FailableResult with invalid success field fails safeParseInterface.
   * **Validates: Requirements 5.1**
   */
  it('Property 1: FailableResult with invalid success field fails validation', () => {
    const invalidBooleanArb: fc.Arbitrary<unknown> = fc.oneof(
      fc.constant('true'),
      fc.constant(1),
      fc.constant(0),
      fc.constant(null),
      fc.constant(undefined),
    );

    fc.assert(
      fc.property(invalidBooleanArb, (badSuccess) => {
        const result = safeParseInterface(
          { success: badSuccess },
          BrandedFailableResult,
        );
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
