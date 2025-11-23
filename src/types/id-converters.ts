/**
 * Type-safe ID conversion utilities for node-express-suite
 */
import { Types } from 'mongoose';

/**
 * Type constraint for valid ID types
 */
export type ValidIdType = string | Types.ObjectId;

/**
 * Convert a MongoDB ObjectId to a generic ID type
 * This is a type-safe wrapper for ID conversions in the generic context
 * @param id - The MongoDB ObjectId to convert
 * @returns The ID as the generic type I
 */
export function convertObjectIdToGenericId<I extends ValidIdType>(
  id: Types.ObjectId,
): I {
  // When I is Types.ObjectId, return as-is
  // When I is string, this would need conversion (but we return ObjectId)
  // This function assumes I is compatible with Types.ObjectId
  return id as I;
}

/**
 * Convert a string to a generic ID type via MongoDB ObjectId
 * @param idString - The string representation of the ID
 * @returns The ID as the generic type I
 */
export function convertStringToGenericId<I extends ValidIdType>(
  idString: string,
): I {
  return new Types.ObjectId(idString) as I;
}

/**
 * Convert a generic ID to a MongoDB ObjectId
 * @param id - The generic ID to convert
 * @returns The ID as a MongoDB ObjectId
 */
export function convertGenericIdToObjectId<I extends ValidIdType>(
  id: I,
): Types.ObjectId {
  if (id instanceof Types.ObjectId) {
    return id;
  }
  if (typeof id === 'string') {
    return new Types.ObjectId(id);
  }
  // If it's already an ObjectId but TypeScript doesn't know
  return id as Types.ObjectId;
}
