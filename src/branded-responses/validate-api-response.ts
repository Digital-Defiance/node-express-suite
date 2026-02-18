import { safeParseInterface } from '@digitaldefiance/branded-interface';
import type {
  BrandedInterfaceDefinition,
  InterfaceSafeParseResult,
  BrandedInstance,
} from '@digitaldefiance/branded-interface';

export function validateApiResponse<T extends Record<string, unknown>>(
  response: unknown,
  definition: BrandedInterfaceDefinition<T>,
): InterfaceSafeParseResult<BrandedInstance<T>> {
  return safeParseInterface(response, definition);
}
