export function isNonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.length > 0;
}

export function isNonNegativeInt(v: unknown): boolean {
  return (
    typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v >= 0
  );
}

export function isPositiveInt(v: unknown): boolean {
  return (
    typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v) && v > 0
  );
}

export function isNonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}

export function isStringArray(v: unknown): boolean {
  return Array.isArray(v) && v.every((el) => typeof el === 'string');
}

export function isNonNullObject(v: unknown): boolean {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function isBoolean(v: unknown): boolean {
  return typeof v === 'boolean';
}
