/**
 * @fileoverview Forward Error Correction constants interface.
 * Defines configuration constants for FEC shard operations.
 * @module interfaces/fec-consts
 */

/**
 * Constants for Forward Error Correction operations.
 * Defines maximum shard size for data splitting.
 */
export interface IFECConsts {
  /** Maximum size of a single shard */
  MAX_SHARD_SIZE: number;
}
