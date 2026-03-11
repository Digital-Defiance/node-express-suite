/**
 * Property-based tests for mnemonic format validation against MnemonicRegex.
 *
 * Feature: user-provided-mnemonic, Property 2: Mnemonic format validation against MnemonicRegex
 *
 * The MnemonicRegex from constants validates BIP39 mnemonic format (12/15/18/21/24 words).
 * UserService.newUser trims and validates the mnemonic against this regex, throwing
 * TranslatableSuiteError(Validation_MnemonicRegex) when the format is invalid.
 *
 * We test the regex directly to avoid instantiating the full UserService with its
 * complex dependencies (MongoDB, MnemonicService, EciesService, etc.), and also verify
 * that the error type and key are correct for invalid mnemonics.
 *
 * **Validates: Requirements 2.1, 2.2**
 */

import * as fc from 'fast-check';
import { CORE } from '@digitaldefiance/suite-core-lib/src/constants';
import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib/src/enumerations/suite-core-string-key';
import { TranslatableSuiteError } from '@digitaldefiance/suite-core-lib/src/errors/translatable-suite';

const MnemonicRegex = CORE.MnemonicRegex;

/** Valid BIP39 word counts */
const VALID_WORD_COUNTS = [12, 15, 18, 21, 24] as const;

/**
 * Arbitrary that generates a single word-like token (alphanumeric/underscore, no whitespace).
 * Uses \w-compatible characters since MnemonicRegex uses \w+ for word matching.
 */
const wordArb = fc
  .array(
    fc.oneof(
      fc.integer({ min: 0x61, max: 0x7a }).map((c) => String.fromCharCode(c)), // a-z
      fc.integer({ min: 0x41, max: 0x5a }).map((c) => String.fromCharCode(c)), // A-Z
      fc.integer({ min: 0x30, max: 0x39 }).map((c) => String.fromCharCode(c)), // 0-9
      fc.constant('_'), // underscore (matched by \w)
    ),
    { minLength: 1, maxLength: 8 },
  )
  .map((chars) => chars.join(''));

/**
 * Arbitrary that generates a mnemonic-like phrase with a specific word count.
 * Words are separated by single spaces.
 */
function mnemonicWithWordCount(count: number): fc.Arbitrary<string> {
  return fc
    .array(wordArb, { minLength: count, maxLength: count })
    .map((words) => words.join(' '));
}

/**
 * Arbitrary that generates a valid-format mnemonic (12, 15, 18, 21, or 24 words).
 */
const validMnemonicArb = fc.oneof(
  ...VALID_WORD_COUNTS.map((n) => mnemonicWithWordCount(n)),
);

/**
 * Arbitrary that generates an invalid word count (not 12, 15, 18, 21, or 24).
 */
const invalidWordCountArb = fc
  .integer({ min: 1, max: 30 })
  .filter(
    (n) => !VALID_WORD_COUNTS.includes(n as (typeof VALID_WORD_COUNTS)[number]),
  );

/**
 * Arbitrary that generates a mnemonic-like phrase with an invalid word count.
 */
const invalidWordCountMnemonicArb = invalidWordCountArb.chain((count) =>
  mnemonicWithWordCount(count),
);

/**
 * Simulates the validation logic from UserService.newUser:
 * trims the input and tests against MnemonicRegex, throwing
 * TranslatableSuiteError(Validation_MnemonicRegex) on failure.
 */
function validateMnemonicFormat(mnemonic: string): void {
  const trimmed = mnemonic.trim();
  if (!MnemonicRegex.test(trimmed)) {
    throw new TranslatableSuiteError(
      SuiteCoreStringKey.Validation_MnemonicRegex,
    );
  }
}

describe('Feature: user-provided-mnemonic, Property 2: Mnemonic format validation against MnemonicRegex', () => {
  /**
   * Property 2a: MnemonicRegex accepts strings with valid word counts (12/15/18/21/24).
   * For any phrase composed of \w+ tokens separated by single spaces with a valid
   * word count, the regex should match.
   *
   * **Validates: Requirements 2.1**
   */
  it('should accept mnemonic phrases with valid word counts (12, 15, 18, 21, 24)', () => {
    fc.assert(
      fc.property(validMnemonicArb, (mnemonic) => {
        expect(MnemonicRegex.test(mnemonic)).toBe(true);
        // Should not throw
        expect(() => validateMnemonicFormat(mnemonic)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2b: MnemonicRegex rejects strings with invalid word counts.
   * For any phrase with a word count not in {12, 15, 18, 21, 24}, the regex
   * should not match, and validation should throw TranslatableSuiteError
   * with key Validation_MnemonicRegex.
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  it('should reject mnemonic phrases with invalid word counts', () => {
    fc.assert(
      fc.property(invalidWordCountMnemonicArb, (mnemonic) => {
        expect(MnemonicRegex.test(mnemonic)).toBe(false);
        try {
          validateMnemonicFormat(mnemonic);
          // Should not reach here
          fail('Expected TranslatableSuiteError to be thrown');
        } catch (e) {
          expect(e).toBeInstanceOf(TranslatableSuiteError);
          expect((e as TranslatableSuiteError).StringName).toBe(
            SuiteCoreStringKey.Validation_MnemonicRegex,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2c: MnemonicRegex rejects arbitrary random strings.
   * Random strings (which are very unlikely to be exactly 12/15/18/21/24
   * space-separated \w+ tokens) should be rejected.
   *
   * **Validates: Requirements 2.2**
   */
  it('should reject arbitrary random strings that do not match the mnemonic pattern', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }).filter((s) => {
          // Filter out strings that happen to match valid word counts
          const trimmed = s.trim();
          const words = trimmed.split(/\s+/).filter(Boolean);
          return !VALID_WORD_COUNTS.includes(
            words.length as (typeof VALID_WORD_COUNTS)[number],
          );
        }),
        (randomStr) => {
          expect(MnemonicRegex.test(randomStr)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2d: Each valid word count is individually accepted.
   * For each of the five valid word counts, generate a phrase and verify acceptance.
   *
   * **Validates: Requirements 2.1**
   */
  it.each(VALID_WORD_COUNTS)(
    'should accept a %d-word mnemonic phrase',
    (wordCount) => {
      fc.assert(
        fc.property(mnemonicWithWordCount(wordCount), (mnemonic) => {
          expect(MnemonicRegex.test(mnemonic)).toBe(true);
          expect(() => validateMnemonicFormat(mnemonic)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    },
  );
});

/**
 * Arbitrary that generates whitespace strings composed of spaces, tabs, and newlines.
 */
const whitespaceArb = fc
  .array(
    fc.oneof(
      fc.constant(' '),
      fc.constant('\t'),
      fc.constant('\n'),
      fc.constant('\r'),
      fc.constant('  '),
    ),
    { minLength: 1, maxLength: 5 },
  )
  .map((chars) => chars.join(''));

describe('Feature: user-provided-mnemonic, Property 3: Whitespace trimming before validation', () => {
  /**
   * Property 3a: Valid mnemonics padded with leading whitespace still pass validation.
   * For any valid mnemonic and arbitrary leading whitespace, trimming then validating
   * should succeed.
   *
   * **Validates: Requirements 2.3**
   */
  it('should accept valid mnemonics with leading whitespace after trimming', () => {
    fc.assert(
      fc.property(whitespaceArb, validMnemonicArb, (ws, mnemonic) => {
        const padded = ws + mnemonic;
        expect(() => validateMnemonicFormat(padded)).not.toThrow();
        expect(padded.trim()).toBe(mnemonic);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3b: Valid mnemonics padded with trailing whitespace still pass validation.
   * For any valid mnemonic and arbitrary trailing whitespace, trimming then validating
   * should succeed.
   *
   * **Validates: Requirements 2.3**
   */
  it('should accept valid mnemonics with trailing whitespace after trimming', () => {
    fc.assert(
      fc.property(validMnemonicArb, whitespaceArb, (mnemonic, ws) => {
        const padded = mnemonic + ws;
        expect(() => validateMnemonicFormat(padded)).not.toThrow();
        expect(padded.trim()).toBe(mnemonic);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3c: Valid mnemonics padded with both leading and trailing whitespace
   * still pass validation. The trimmed result equals the original mnemonic.
   *
   * **Validates: Requirements 2.3**
   */
  it('should accept valid mnemonics with both leading and trailing whitespace after trimming', () => {
    fc.assert(
      fc.property(
        whitespaceArb,
        validMnemonicArb,
        whitespaceArb,
        (leadingWs, mnemonic, trailingWs) => {
          const padded = leadingWs + mnemonic + trailingWs;
          expect(() => validateMnemonicFormat(padded)).not.toThrow();
          expect(padded.trim()).toBe(mnemonic);
        },
      ),
      { numRuns: 100 },
    );
  });
});
