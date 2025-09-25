import { ECIES, IECIESConstants } from '@digitaldefiance/ecies-lib';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { SymmetricErrorType } from '../enumerations/symmetric-error-type';
import { SymmetricError } from '../errors/symmetric';
import { ISymmetricEncryptionResults } from '../interfaces/symmetric-encryption-results';

function hasToJsonMethod<T>(obj: T): obj is T & { toJson: () => string } {
  return typeof obj === 'object' && obj !== null && 'toJson' in obj;
}

/**
 * Service for handling symmetric encryption operations.
 * This service provides functionality for:
 * - AES encryption/decryption of buffers and JSON data
 * - Key and IV generation
 * - Secure cryptographic operations
 */
export class SymmetricService {
  public static symmetricKeyBits(
    eciesConstants: IECIESConstants = ECIES,
  ): number {
    return eciesConstants.SYMMETRIC.KEY_BITS;
  }

  public static symmetricKeyBytes(
    eciesConstants: IECIESConstants = ECIES,
  ): number {
    return eciesConstants.SYMMETRIC.KEY_SIZE;
  }

  /**
   * Encrypt data with AES
   * @param data The data to encrypt
   * @param encryptionKey Optional encryption key (will be randomly generated if not provided)
   * @returns Object containing encrypted data and key
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
   * Decrypt the given buffer with AES
   * @param encryptedData The encrypted data to decrypt
   * @param key The key to use for decryption
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
   * Encrypt JSON data with AES
   * @param data The data to encrypt
   * @param encryptionKey Optional encryption key (will be randomly generated if not provided)
   * @returns Object containing encrypted data and key
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
   * Decrypt the given buffer with AES and parse as JSON
   * @param encryptedData The encrypted data to decrypt
   * @param key The key to use for decryption
   * @returns Decrypted data parsed as type T
   */
  public static decryptJson<T>(encryptedData: Buffer, key: Buffer): T {
    return JSON.parse(
      SymmetricService.decryptBuffer(encryptedData, key).toString('utf8'),
    ) as T;
  }
}
