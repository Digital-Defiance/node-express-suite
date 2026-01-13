/**
 * @fileoverview Checksum configuration interface.
 * Defines algorithm and encoding options for checksum generation.
 * @module interfaces/checksum-config
 */

/**
 * Configuration for checksum generation.
 * @property {string} algorithm - Hash algorithm (e.g., 'sha256', 'sha512')
 * @property {'hex' | 'base64'} encoding - Output encoding format
 */
export interface IChecksumConfig {
  algorithm: string;
  encoding: 'hex' | 'base64';
}
