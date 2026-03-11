/**
 * Property-based tests for deterministic key derivation round-trip.
 *
 * Feature: user-provided-mnemonic, Property 6: Deterministic key derivation round-trip
 *
 * Tests that BackendMember.newMember(eciesService, ..., forceMnemonic=mnemonic)
 * produces the same public key as Member.fromMnemonic(mnemonic, ...), and the
 * returned mnemonic equals the input.
 *
 * We use the node-ecies-lib Member (aliased as BackendMember) and ECIESService
 * directly, generating real BIP39 mnemonics via eciesService.generateNewMnemonic().
 *
 * **Validates: Requirements 4.1, 4.2**
 */

import * as fc from 'fast-check';
import {
  Member as BackendMember,
  ECIESService,
} from '@digitaldefiance/node-ecies-lib';
import {
  EmailString,
  MemberType,
  SecureString,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';

/**
 * Arbitrary that generates a valid BIP39 mnemonic by calling
 * eciesService.generateNewMnemonic(). Each call produces a
 * cryptographically random 12-word mnemonic.
 *
 * We extract the string value from the SecureString, dispose it,
 * and return the raw string so fast-check can shrink/report it.
 */
function validBip39MnemonicArb(
  eciesService: ECIESService,
): fc.Arbitrary<string> {
  return fc.constant(null).map(() => {
    const secureMnemonic = eciesService.generateNewMnemonic();
    const value = secureMnemonic.value;
    secureMnemonic.dispose();
    return value ?? '';
  });
}

describe('Feature: user-provided-mnemonic, Property 6: Deterministic key derivation round-trip', () => {
  let eciesService: ECIESService;

  beforeAll(() => {
    eciesService = new ECIESService();
  });

  /**
   * Property 6a: BackendMember.newMember with forceMnemonic produces the same
   * public key as BackendMember.fromMnemonic for the same mnemonic.
   *
   * For any valid BIP39 mnemonic, creating a member via newMember(eciesService,
   * ..., forceMnemonic=mnemonic) and via fromMnemonic(mnemonic, eciesService, ...)
   * should yield identical compressed public keys.
   *
   * **Validates: Requirements 4.1, 4.2**
   */
  it('should produce the same public key via newMember(forceMnemonic) and fromMnemonic', () => {
    fc.assert(
      fc.property(validBip39MnemonicArb(eciesService), (mnemonicStr) => {
        const secureMnemonic1 = new SecureString(mnemonicStr);
        const secureMnemonic2 = new SecureString(mnemonicStr);

        try {
          // Create via newMember with forceMnemonic
          const { member: newMemberResult } = BackendMember.newMember(
            eciesService,
            MemberType.User,
            'TestUser',
            new EmailString('test@example.com'),
            secureMnemonic1,
          );

          // Create via fromMnemonic
          const fromMnemonicResult = BackendMember.fromMnemonic(
            secureMnemonic2,
            eciesService,
            MemberType.User,
            'TestUser',
            new EmailString('test@example.com'),
          );

          // Both should produce the same compressed public key
          const newMemberPubKey = uint8ArrayToHex(newMemberResult.publicKey);
          const fromMnemonicPubKey = uint8ArrayToHex(
            fromMnemonicResult.publicKey,
          );

          expect(newMemberPubKey).toBe(fromMnemonicPubKey);

          // Public keys should be valid compressed keys (33 bytes = 66 hex chars)
          expect(newMemberPubKey).toHaveLength(66);
          expect(newMemberPubKey).toMatch(/^(02|03)[0-9a-f]{64}$/);
        } finally {
          secureMnemonic1.dispose();
          secureMnemonic2.dispose();
        }
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Property 6b: The mnemonic returned by newMember(forceMnemonic) equals the
   * input mnemonic.
   *
   * When a user provides a mnemonic via forceMnemonic, the returned mnemonic
   * in the registration result should be the same SecureString (or contain
   * the same value) as the input.
   *
   * **Validates: Requirements 4.2**
   */
  it('should return the same mnemonic that was provided as forceMnemonic', () => {
    fc.assert(
      fc.property(validBip39MnemonicArb(eciesService), (mnemonicStr) => {
        const secureMnemonic = new SecureString(mnemonicStr);

        try {
          const { mnemonic: returnedMnemonic } = BackendMember.newMember(
            eciesService,
            MemberType.User,
            'TestUser',
            new EmailString('test@example.com'),
            secureMnemonic,
          );

          // The returned mnemonic should equal the input
          expect(returnedMnemonic.value).toBe(mnemonicStr);

          returnedMnemonic.dispose();
        } finally {
          secureMnemonic.dispose();
        }
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Property 6c: Key derivation is deterministic — calling newMember twice
   * with the same forceMnemonic produces the same public key.
   *
   * **Validates: Requirements 4.1**
   */
  it('should produce the same public key when newMember is called twice with the same mnemonic', () => {
    fc.assert(
      fc.property(validBip39MnemonicArb(eciesService), (mnemonicStr) => {
        const secureMnemonic1 = new SecureString(mnemonicStr);
        const secureMnemonic2 = new SecureString(mnemonicStr);

        try {
          const { member: member1 } = BackendMember.newMember(
            eciesService,
            MemberType.User,
            'TestUser',
            new EmailString('test@example.com'),
            secureMnemonic1,
          );

          const { member: member2 } = BackendMember.newMember(
            eciesService,
            MemberType.User,
            'TestUser',
            new EmailString('test@example.com'),
            secureMnemonic2,
          );

          expect(uint8ArrayToHex(member1.publicKey)).toBe(
            uint8ArrayToHex(member2.publicKey),
          );
        } finally {
          secureMnemonic1.dispose();
          secureMnemonic2.dispose();
        }
      }),
      { numRuns: 20 },
    );
  });
});

/**
 * Property-based tests for registration invariants preserved with user-provided mnemonic.
 *
 * Feature: user-provided-mnemonic, Property 7: Registration invariants preserved with user-provided mnemonic
 *
 * Tests that registration with a user-provided mnemonic always produces non-empty
 * backup codes, and when a password is also provided, passwordWrappedPrivateKey
 * is non-null.
 *
 * We test the component-level invariants that UserService.newUser relies on:
 * - BackupCode.generateBackupCodes() always returns a non-empty array
 * - KeyWrappingService.wrapSecret() with a valid password produces a non-null result
 *
 * **Validates: Requirements 4.3, 4.4**
 */

import { SecureBuffer } from '@digitaldefiance/ecies-lib';
import { BackupCode } from '../../src/backup-code';
import { LocalhostConstants } from '../../src/constants';
import { KeyWrappingService } from '../../src/services/key-wrapping';

/**
 * Arbitrary that generates a valid password string matching the PasswordRegex.
 * Format: uppercase + lowercase + digit + special char + alphanumeric padding.
 * Ensures at least one letter, one digit, and one special character with min 8 chars.
 */
function validPasswordArb(): fc.Arbitrary<string> {
  return fc
    .tuple(
      fc.constantFrom(
        'A',
        'B',
        'C',
        'D',
        'E',
        'F',
        'G',
        'H',
        'J',
        'K',
        'L',
        'M',
        'N',
        'P',
        'Q',
        'R',
        'S',
        'T',
        'U',
        'V',
        'W',
        'X',
        'Y',
        'Z',
      ),
      fc.constantFrom(
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'j',
        'k',
        'm',
        'n',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
      ),
      fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'),
      fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')'),
      fc.stringMatching(/^[a-zA-Z0-9]{4,12}$/),
    )
    .map(
      ([upper, lower, digit, special, rest]) =>
        `${upper}${lower}${digit}${special}${rest}`,
    );
}

describe('Feature: user-provided-mnemonic, Property 7: Registration invariants preserved with user-provided mnemonic', () => {
  let eciesService: ECIESService;
  let keyWrappingService: KeyWrappingService;

  beforeAll(() => {
    eciesService = new ECIESService();
    keyWrappingService = new KeyWrappingService();
  });

  /**
   * Property 7a: Backup codes are always non-empty for any registration
   * with a user-provided mnemonic.
   *
   * For any valid BIP39 mnemonic, creating a BackendMember via forceMnemonic
   * and then generating backup codes should always produce a non-empty array
   * of valid backup codes.
   *
   * **Validates: Requirements 4.3**
   */
  it('should always produce non-empty backup codes when registering with a user-provided mnemonic', () => {
    fc.assert(
      fc.property(validBip39MnemonicArb(eciesService), (mnemonicStr) => {
        const secureMnemonic = new SecureString(mnemonicStr);

        try {
          // Create member with forceMnemonic (same as UserService.newUser does)
          const { member } = BackendMember.newMember(
            eciesService,
            MemberType.User,
            'TestUser',
            new EmailString('test@example.com'),
            secureMnemonic,
          );

          // Generate backup codes (same call as UserService.newUser)
          const backupCodes = BackupCode.generateBackupCodes();

          // Backup codes should always be non-empty
          expect(backupCodes.length).toBeGreaterThan(0);

          // Each backup code should have a non-empty value
          for (const code of backupCodes) {
            expect(code.value).toBeTruthy();
            expect(code.value!.length).toBeGreaterThan(0);
          }

          // Member should have been created successfully with a valid public key
          expect(member.publicKey).toBeTruthy();
          expect(member.publicKey.length).toBeGreaterThan(0);
        } finally {
          secureMnemonic.dispose();
        }
      }),
      { numRuns: 20 },
    );
  });

  /**
   * Property 7b: When a password is provided alongside a user-provided mnemonic,
   * the password-wrapped private key is non-null.
   *
   * For any valid BIP39 mnemonic and valid password, creating a BackendMember
   * via forceMnemonic and wrapping its private key with the password should
   * produce a non-null PasswordWrappedSecret with all required fields.
   *
   * **Validates: Requirements 4.4**
   */
  it('should produce non-null passwordWrappedPrivateKey when password is provided with user-provided mnemonic', () => {
    fc.assert(
      fc.property(
        validBip39MnemonicArb(eciesService),
        validPasswordArb(),
        (mnemonicStr, password) => {
          const secureMnemonic = new SecureString(mnemonicStr);
          const passwordSecure = new SecureString(password);

          try {
            // Create member with forceMnemonic
            const { member } = BackendMember.newMember(
              eciesService,
              MemberType.User,
              'TestUser',
              new EmailString('test@example.com'),
              secureMnemonic,
            );

            // Member must have a private key for wrapping
            expect(member.privateKey).toBeTruthy();

            const priv = new SecureBuffer(member.privateKey!.value);
            try {
              // Wrap private key with password (same as UserService.newUser)
              const wrapped = keyWrappingService.wrapSecret(
                priv,
                passwordSecure,
                LocalhostConstants,
              );

              // PasswordWrappedSecret should be non-null with all required fields
              expect(wrapped).toBeTruthy();
              expect(wrapped.salt).toBeTruthy();
              expect(wrapped.iv).toBeTruthy();
              expect(wrapped.authTag).toBeTruthy();
              expect(wrapped.ciphertext).toBeTruthy();
              expect(wrapped.iterations).toBeGreaterThan(0);

              // Verify round-trip: unwrapping should recover the original key
              const unwrappedPasswordSecure = new SecureString(password);
              try {
                const unwrapped = keyWrappingService.unwrapSecret(
                  wrapped,
                  unwrappedPasswordSecure,
                  LocalhostConstants,
                );
                expect(Buffer.from(unwrapped.value).toString('hex')).toBe(
                  Buffer.from(member.privateKey!.value).toString('hex'),
                );
                unwrapped.dispose();
              } finally {
                unwrappedPasswordSecure.dispose();
              }
            } finally {
              priv.dispose();
            }
          } finally {
            secureMnemonic.dispose();
            passwordSecure.dispose();
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
