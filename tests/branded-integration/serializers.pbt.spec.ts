/**
 * Property-based tests for serialization round-trip of branded API responses.
 *
 * Feature: branded-api-responses, Property 4: Serialization round-trip
 *
 * For each branded API response definition, generate valid data, create a branded
 * instance, serialize via the corresponding serializer's serialize(), deserialize
 * via deserialize(), and compare enumerable properties of the result to the original.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */

import * as fc from 'fast-check';
import {
  resetInterfaceRegistry,
  type BrandedInstance,
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
import {
  apiMessageResponseSerializer,
  apiErrorResponseSerializer,
  apiTokenResponseSerializer,
  apiLoginResponseSerializer,
  apiRegistrationResponseSerializer,
  apiChallengeResponseSerializer,
  apiMnemonicResponseSerializer,
  apiBackupCodesResponseSerializer,
  apiCodeCountResponseSerializer,
  apiRequestUserResponseSerializer,
  apiUserSettingsResponseSerializer,
  apiExpressValidationErrorResponseSerializer,
  apiMongoValidationErrorResponseSerializer,
  statusCodeResponseSerializer,
  failableResultSerializer,
} from '../../src/branded-responses/serializers';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract only enumerable (own, string-keyed) properties for comparison.
 * Branded instances carry non-enumerable Symbol metadata that is stripped
 * by JSON.stringify, so we compare only the data portion.
 */
function enumerableProps(obj: object): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[key] = (obj as Record<string, unknown>)[key];
  }
  return result;
}

// =============================================================================
// Shared Generators (JSON-serializable values only)
// =============================================================================

/** Non-empty string arbitrary. */
const nonEmptyStringArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1 })
  .filter((s) => s.length > 0);

/** Non-null plain object with JSON-serializable values (excluding -0 which is not JSON round-trip safe). */
const jsonSafeValueArb: fc.Arbitrary<unknown> = fc
  .jsonValue()
  .map(function stripNegZero(v: unknown): unknown {
    if (typeof v === 'number' && Object.is(v, -0)) return 0;
    if (Array.isArray(v)) return v.map(stripNegZero);
    if (typeof v === 'object' && v !== null) {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(v)) {
        result[key] = stripNegZero(val);
      }
      return result;
    }
    return v;
  });

const jsonObjectArb: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  fc.string(),
  jsonSafeValueArb,
);

/** Non-empty string array arbitrary. */
const nonEmptyStringArrayArb: fc.Arbitrary<string[]> = fc.array(fc.string(), {
  minLength: 1,
});

/** Non-negative integer arbitrary. */
const nonNegativeIntArb: fc.Arbitrary<number> = fc.nat();

/** Positive integer arbitrary. */
const positiveIntArb: fc.Arbitrary<number> = fc.integer({ min: 1 });

// =============================================================================
// Per-Definition Valid Object Generators (JSON-serializable)
// =============================================================================

const validApiMessageResponseArb = fc.record({
  message: nonEmptyStringArb,
});

const validApiErrorResponseArb = fc.record({
  message: nonEmptyStringArb,
  error: jsonObjectArb,
});

const validApiTokenResponseArb = fc.record({
  message: nonEmptyStringArb,
  token: nonEmptyStringArb,
});

const validApiLoginResponseArb = fc.record({
  message: nonEmptyStringArb,
  token: nonEmptyStringArb,
  serverPublicKey: fc.string(),
  user: jsonObjectArb,
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
  user: jsonObjectArb,
});

const validUserSettingsArb = fc.record({
  email: nonEmptyStringArb,
  timezone: nonEmptyStringArb,
  currency: nonEmptyStringArb,
  siteLanguage: nonEmptyStringArb,
  darkMode: fc.boolean(),
  directChallenge: fc.boolean(),
  totpEnabled: fc.boolean(),
});

const validApiUserSettingsResponseArb = fc.record({
  message: nonEmptyStringArb,
  settings: validUserSettingsArb,
});

const validApiExpressValidationErrorResponseArb = fc.record({
  message: nonEmptyStringArb,
  errors: fc.array(jsonSafeValueArb, { minLength: 1 }),
});

const validApiMongoValidationErrorResponseArb = fc.record({
  message: nonEmptyStringArb,
  errors: jsonObjectArb,
});

const validStatusCodeResponseArb = fc.record({
  statusCode: positiveIntArb,
  response: jsonObjectArb,
});

const validFailableResultArb = fc.record({
  success: fc.boolean(),
});

// =============================================================================
// Round-trip test pairs
// =============================================================================

/**
 * Wraps a definition + serializer pair into a closure that performs the
 * round-trip test. This avoids TypeScript variance issues with
 * BrandedInterfaceDefinition<T>'s contravariant create() method by
 * capturing the concrete type T inside the generic closure.
 */
interface RoundTripCase {
  name: string;
  arb: fc.Arbitrary<Record<string, unknown>>;
  assertRoundTrip: (data: Record<string, unknown>) => void;
}

function makeCase<T extends Record<string, unknown>>(
  name: string,
  definition: {
    validate: (data: unknown) => data is T;
    create: (data: T) => BrandedInstance<T>;
  },
  serializer: {
    serialize: (instance: BrandedInstance<T>) => string;
    deserialize: (input: unknown) => {
      success: boolean;
      value?: BrandedInstance<T>;
    };
  },
  arb: fc.Arbitrary<Record<string, unknown>>,
): RoundTripCase {
  return {
    name,
    arb,
    assertRoundTrip(data: Record<string, unknown>): void {
      expect(definition.validate(data)).toBe(true);
      if (!definition.validate(data)) return;

      const instance = definition.create(data);
      const json = serializer.serialize(instance);
      const result = serializer.deserialize(json);

      expect(result.success).toBe(true);
      if (result.success && result.value) {
        expect(enumerableProps(result.value)).toEqual(
          enumerableProps(instance),
        );
      }
    },
  };
}

const roundTripCases: RoundTripCase[] = [
  makeCase(
    'ApiMessageResponse',
    BrandedApiMessageResponse,
    apiMessageResponseSerializer,
    validApiMessageResponseArb,
  ),
  makeCase(
    'ApiErrorResponse',
    BrandedApiErrorResponse,
    apiErrorResponseSerializer,
    validApiErrorResponseArb,
  ),
  makeCase(
    'ApiTokenResponse',
    BrandedApiTokenResponse,
    apiTokenResponseSerializer,
    validApiTokenResponseArb,
  ),
  makeCase(
    'ApiLoginResponse',
    BrandedApiLoginResponse,
    apiLoginResponseSerializer,
    validApiLoginResponseArb,
  ),
  makeCase(
    'ApiRegistrationResponse',
    BrandedApiRegistrationResponse,
    apiRegistrationResponseSerializer,
    validApiRegistrationResponseArb,
  ),
  makeCase(
    'ApiChallengeResponse',
    BrandedApiChallengeResponse,
    apiChallengeResponseSerializer,
    validApiChallengeResponseArb,
  ),
  makeCase(
    'ApiMnemonicResponse',
    BrandedApiMnemonicResponse,
    apiMnemonicResponseSerializer,
    validApiMnemonicResponseArb,
  ),
  makeCase(
    'ApiBackupCodesResponse',
    BrandedApiBackupCodesResponse,
    apiBackupCodesResponseSerializer,
    validApiBackupCodesResponseArb,
  ),
  makeCase(
    'ApiCodeCountResponse',
    BrandedApiCodeCountResponse,
    apiCodeCountResponseSerializer,
    validApiCodeCountResponseArb,
  ),
  makeCase(
    'ApiRequestUserResponse',
    BrandedApiRequestUserResponse,
    apiRequestUserResponseSerializer,
    validApiRequestUserResponseArb,
  ),
  makeCase(
    'ApiUserSettingsResponse',
    BrandedApiUserSettingsResponse,
    apiUserSettingsResponseSerializer,
    validApiUserSettingsResponseArb,
  ),
  makeCase(
    'ApiExpressValidationErrorResponse',
    BrandedApiExpressValidationErrorResponse,
    apiExpressValidationErrorResponseSerializer,
    validApiExpressValidationErrorResponseArb,
  ),
  makeCase(
    'ApiMongoValidationErrorResponse',
    BrandedApiMongoValidationErrorResponse,
    apiMongoValidationErrorResponseSerializer,
    validApiMongoValidationErrorResponseArb,
  ),
  makeCase(
    'StatusCodeResponse',
    BrandedStatusCodeResponse,
    statusCodeResponseSerializer,
    validStatusCodeResponseArb,
  ),
  makeCase(
    'FailableResult',
    BrandedFailableResult,
    failableResultSerializer,
    validFailableResultArb,
  ),
];

// =============================================================================
// Tests
// =============================================================================

describe('Feature: branded-api-responses, Property 4: Serialization round-trip', () => {
  beforeEach(() => {
    resetInterfaceRegistry();
  });

  afterEach(() => {
    resetInterfaceRegistry();
  });

  // ---------------------------------------------------------------------------
  // Per-definition round-trip tests
  // ---------------------------------------------------------------------------

  for (const { name, arb, assertRoundTrip } of roundTripCases) {
    /**
     * Property 4: Serialization round-trip for each definition.
     * **Validates: Requirements 8.1, 8.2**
     */
    it(`Property 4: ${name} serialization round-trip preserves enumerable properties`, () => {
      fc.assert(
        fc.property(arb, (data) => {
          assertRoundTrip(data);
        }),
        { numRuns: 100 },
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Invalid JSON deserialization
  // ---------------------------------------------------------------------------

  /**
   * Property 4: Invalid JSON fails deserialization for all serializers.
   * **Validates: Requirements 8.3**
   */
  it('Property 4: invalid JSON fails deserialization for all serializers', () => {
    const invalidJsonArb: fc.Arbitrary<string> = fc.oneof(
      fc.constant('{invalid json}'),
      fc.constant('not json at all'),
      fc.constant('{'),
      fc.constant('[unclosed'),
      fc.constant("{'single': 'quotes'}"),
    );

    const allSerializers = [
      apiMessageResponseSerializer,
      apiErrorResponseSerializer,
      apiTokenResponseSerializer,
      apiLoginResponseSerializer,
      apiRegistrationResponseSerializer,
      apiChallengeResponseSerializer,
      apiMnemonicResponseSerializer,
      apiBackupCodesResponseSerializer,
      apiCodeCountResponseSerializer,
      apiRequestUserResponseSerializer,
      apiUserSettingsResponseSerializer,
      apiExpressValidationErrorResponseSerializer,
      apiMongoValidationErrorResponseSerializer,
      statusCodeResponseSerializer,
      failableResultSerializer,
    ];

    fc.assert(
      fc.property(
        invalidJsonArb,
        fc.constantFrom(...allSerializers),
        (badJson, serializer) => {
          const result = serializer.deserialize(badJson);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
