/**
 * Property-based tests for validation helper correctness.
 *
 * Feature: branded-api-responses, Property 2: Validation helper correctness
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
 */

import * as fc from 'fast-check';
import {
  isNonEmptyString,
  isNonNegativeInt,
  isPositiveInt,
  isNonEmptyArray,
  isStringArray,
  isNonNullObject,
  isBoolean,
} from '../../src/branded-responses/validators';

// =============================================================================
// Reference predicates
// =============================================================================

function refIsNonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.length > 0;
}

function refIsNonNegativeInt(v: unknown): boolean {
  return (
    typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v >= 0
  );
}

function refIsPositiveInt(v: unknown): boolean {
  return (
    typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v > 0
  );
}

function refIsNonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}

function refIsStringArray(v: unknown): boolean {
  return Array.isArray(v) && v.every((el) => typeof el === 'string');
}

function refIsNonNullObject(v: unknown): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function refIsBoolean(v: unknown): boolean {
  return typeof v === 'boolean';
}

// =============================================================================
// Tests
// =============================================================================

describe('Feature: branded-api-responses, Property 2: Validation helper correctness', () => {
  /**
   * Property 2: isNonEmptyString matches its reference predicate for all values.
   * **Validates: Requirements 6.1**
   */
  it('isNonEmptyString matches reference predicate for arbitrary values', () => {
    fc.assert(
      fc.property(fc.anything(), (v) => {
        expect(isNonEmptyString(v)).toBe(refIsNonEmptyString(v));
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property 2: isNonNegativeInt matches its reference predicate for all values.
   * **Validates: Requirements 6.2**
   */
  it('isNonNegativeInt matches reference predicate for arbitrary values', () => {
    fc.assert(
      fc.property(fc.anything(), (v) => {
        expect(isNonNegativeInt(v)).toBe(refIsNonNegativeInt(v));
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property 2: isPositiveInt matches its reference predicate for all values.
   * **Validates: Requirements 6.2**
   */
  it('isPositiveInt matches reference predicate for arbitrary values', () => {
    fc.assert(
      fc.property(fc.anything(), (v) => {
        expect(isPositiveInt(v)).toBe(refIsPositiveInt(v));
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property 2: isNonEmptyArray matches its reference predicate for all values.
   * **Validates: Requirements 6.3**
   */
  it('isNonEmptyArray matches reference predicate for arbitrary values', () => {
    fc.assert(
      fc.property(fc.anything(), (v) => {
        expect(isNonEmptyArray(v)).toBe(refIsNonEmptyArray(v));
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property 2: isStringArray matches its reference predicate for all values.
   * **Validates: Requirements 6.4**
   */
  it('isStringArray matches reference predicate for arbitrary values', () => {
    fc.assert(
      fc.property(fc.anything(), (v) => {
        expect(isStringArray(v)).toBe(refIsStringArray(v));
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property 2: isNonNullObject matches its reference predicate for all values.
   * **Validates: Requirements 6.5**
   */
  it('isNonNullObject matches reference predicate for arbitrary values', () => {
    fc.assert(
      fc.property(fc.anything(), (v) => {
        expect(isNonNullObject(v)).toBe(refIsNonNullObject(v));
      }),
      { numRuns: 200 },
    );
  });

  /**
   * Property 2: isBoolean matches its reference predicate for all values.
   * **Validates: Requirements 6.1**
   */
  it('isBoolean matches reference predicate for arbitrary values', () => {
    fc.assert(
      fc.property(fc.anything(), (v) => {
        expect(isBoolean(v)).toBe(refIsBoolean(v));
      }),
      { numRuns: 200 },
    );
  });
});
