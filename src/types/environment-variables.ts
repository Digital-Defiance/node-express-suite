/**
 * Type-safe environment variable access utilities
 */

/**
 * Interface for environment variables with index signature
 */
export interface EnvironmentVariables {
  [key: string]: string | undefined;
}

/**
 * Type-safe function to get environment variable
 * @param obj - The environment object (typically process.env)
 * @param key - The environment variable key
 * @returns The environment variable value or undefined
 */
export function getEnvVar(
  obj: EnvironmentVariables,
  key: string,
): string | undefined {
  return obj[key];
}

/**
 * Type guard to check if an object has a specific property
 * @param obj - The object to check
 * @param key - The property key
 * @returns True if the object has the property
 */
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K,
): obj is T & Record<K, unknown> {
  return key in obj;
}

/**
 * Type-safe function to get a property from an object
 * @param obj - The object to get the property from
 * @param key - The property key
 * @returns The property value or undefined
 */
export function getProperty<T extends object, K extends string>(
  obj: T,
  key: K,
): unknown {
  if (hasProperty(obj, key)) {
    return obj[key];
  }
  return undefined;
}
