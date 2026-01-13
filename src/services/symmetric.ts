/**
 * @fileoverview Service for symmetric encryption operations using AES-256-GCM.
 * Provides encryption/decryption for buffers and JSON data with automatic key generation.
 * @module services/symmetric
 */

import { ECIES, IECIESConstants } from '@digitaldefiance/ecies-lib';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { SymmetricErrorType } from '../enumerations/symmetric-error-type';
import { SymmetricError } from '../errors/symmetric';
import { ISymmetricEncryptionResults } from '../interfaces/symmetric-encryption-results';

/**
 * Type guard to check if an object has a toJson method.
 * @template T Object type to check
 * @param obj Object to check
 * @returns True if object has toJson method
 */
function hasToJsonMethod<T>(obj: T): obj is T & { toJson: () => string } {
  return typeof obj === 'object' && obj !== null && 'toJson' in obj;
}

/**
 * Service for handling symmetric encryption operations using AES-256-GCM.
 * Provides functionality for encrypting/decrypting buffers and JSON data with automatic key generation.
 */
export class SymmetricService {
  /**
   * Gets the symmetric key size in bits from ECIES constants.
   * @param eciesConstants ECIES constants (defaults to ECIES)
   * @returns Symmetric key size in bits
   */
  public static symmetricKeyBits(
    eciesConstants: IECIESConstants = ECIES,
  ): number {
    return eciesConstants.SYMMETRIC.KEY_BITS;
  }

  /**
   * Gets the symmetric key size in bytes from ECIES constants.
   * @param eciesConstants ECIES constants (defaults to ECIES)
   * @returns Symmetric key size in bytes
   */
  public static symmetricKeyBytes(
    eciesConstants: IECIESConstants = ECIES,
  ): number {
    return eciesConstants.SYMMETRIC.KEY_SIZE;
  }

  /**
   * Encrypts data with AES-256-GCM.
   * @param data Buffer to encrypt
   * @param encryptionKey Optional encryption key (randomly generated if not provided)
   * @param eciesConstants ECIES constants (defaults to ECIES)
   * @returns Object containing encrypted data and key
   * @throws {SymmetricError} If encryption key length is invalid
   */
  public static encryptBuffer(
    data: Buffer,
    encryptionKey?: Buffer,
    eciesConstants: IECIESConstants = ECIES,
  ): ISymmetricEncryptionResults {
    if (
      encryptionKey &&
      encryptionKey.length != eciesConstants.SYMMETRIC.KEY_SIZE
    ) {
      throw new SymmetricError(SymmetricErrorType.InvalidKeyLength);
    }

    // encrypt the document using AES-256 and the key
    // Initialization Vector
    const ivBuffer = randomBytes(eciesConstants.IV_SIZE);
    const key: Buffer =
      encryptionKey ?? randomBytes(eciesConstants.SYMMETRIC.KEY_SIZE);
    const cipher = createCipheriv(
      eciesConstants.SYMMETRIC_ALGORITHM_CONFIGURATION,
      key,
      ivBuffer,
    );

    const ciphertextBuffer = cipher.update(data);
    const finalBuffer = cipher.final();
    const authTag = cipher.getAuthTag();

    const encryptionIvPlusData: Buffer = Buffer.concat([
      ivBuffer,
      ciphertextBuffer,
      finalBuffer,
      authTag,
    ]);
    return {
      encryptedData: encryptionIvPlusData,
      key: key,
    };
  }

  /**
   * Decrypts data with AES-256-GCM.
   * @param encryptedData Encrypted data buffer (includes IV, ciphertext, and auth tag)
   * @param key Decryption key
   * @param eciesConstants ECIES constants (defaults to ECIES)
   * @returns Decrypted data as a Buffer
   */
  public static decryptBuffer(
    encryptedData: Buffer,
    key: Buffer,
    eciesConstants: IECIESConstants = ECIES,
  ): Buffer {
    const ivBuffer = encryptedData.subarray(0, eciesConstants.IV_SIZE);
    const authTagStart = encryptedData.length - eciesConstants.AUTH_TAG_SIZE;
    const ciphertextBuffer = encryptedData.subarray(
      eciesConstants.IV_SIZE,
      authTagStart,
    );
    const authTag = encryptedData.subarray(authTagStart);

    const decipher = createDecipheriv(
      eciesConstants.SYMMETRIC_ALGORITHM_CONFIGURATION,
      key,
      ivBuffer,
    );
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()]);
  }

  /**
   * Encrypts JSON data with AES-256-GCM.
   * @template T Type of data to encrypt
   * @param data Data to encrypt (will be JSON stringified)
   * @param encryptionKey Optional encryption key (randomly generated if not provided)
   * @returns Object containing encrypted data and key
   * @throws {SymmetricError} If data is null or undefined
   */
  public static encryptJson<T>(
    data: T,
    encryptionKey?: Buffer,
  ): ISymmetricEncryptionResults {
    if (data === null || data === undefined) {
      throw new SymmetricError(SymmetricErrorType.DataNullOrUndefined);
    }
    let dataBuffer: Buffer;
    if (hasToJsonMethod<T>(data)) {
      // amazonq-ignore-next-line false positive
      dataBuffer = Buffer.from(data.toJson(), 'utf8');
    } else {
      dataBuffer = Buffer.from(JSON.stringify(data), 'utf8');
    }
    return SymmetricService.encryptBuffer(dataBuffer, encryptionKey);
  }

  /**
   * Decrypts data with AES-256-GCM and parses as JSON.
   * @template T Type of data to decrypt
   * @param encryptedData Encrypted data buffer
   * @param key Decryption key
   * @returns Decrypted data parsed as type T
   */
  public static decryptJson<T>(encryptedData: Buffer, key: Buffer): T {
    return JSON.parse(
      SymmetricService.decryptBuffer(encryptedData, key).toString('utf8'),
    ) as T;
  }
}
