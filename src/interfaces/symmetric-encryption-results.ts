/**
 * @fileoverview Symmetric encryption results interface.
 * Defines structure for symmetric encryption operation results.
 * @module interfaces/symmetric-encryption-results
 */

/**
 * Results of symmetric encryption operation.
 * @property {Buffer} encryptedData - Encrypted data buffer
 * @property {Buffer} key - Encryption key used
 */
export interface ISymmetricEncryptionResults {
  encryptedData: Buffer;
  key: Buffer;
}
