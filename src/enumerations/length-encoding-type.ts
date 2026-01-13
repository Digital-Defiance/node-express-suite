/**
 * @fileoverview Length encoding type enumeration for variable-length data encoding.
 * Defines encoding types for different integer sizes (8, 16, 32, 64 bit).
 * @module enumerations/length-encoding-type
 */

/**
 * Enumeration for length encoding types used in data serialization.
 * Determines how length values are encoded based on data size.
 */
export enum LengthEncodingType {
  UInt8 = 0,
  UInt16 = 1,
  UInt32 = 2,
  UInt64 = 3,
}
