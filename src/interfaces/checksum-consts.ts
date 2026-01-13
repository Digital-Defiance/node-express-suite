/**
 * @fileoverview Checksum constants interface.
 * Defines configuration constants for SHA3 checksum operations.
 * @module interfaces/checksum-consts
 */

/**
 * Constants for checksum generation and validation.
 * Defines SHA3 algorithm parameters and encoding settings.
 */
export interface IChecksumConsts {
  /** Default hash bits for SHA3 */
  SHA3_DEFAULT_HASH_BITS: number;

  /** Length of a SHA3 checksum buffer in bytes */
  SHA3_BUFFER_LENGTH: number;

  /** Algorithm name for checksums */
  ALGORITHM: string;

  /** Encoding for checksums */
  ENCODING: 'hex' | 'base64';
}
