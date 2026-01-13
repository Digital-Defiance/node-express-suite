/**
 * @fileoverview Deep partial utility type.
 * Recursively makes all properties of a type optional.
 * @module interfaces/deep-partial
 */

/**
 * Recursively makes all properties of a type optional.
 * @template T - Type to make deeply partial
 * @typedef {Object} DeepPartial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
