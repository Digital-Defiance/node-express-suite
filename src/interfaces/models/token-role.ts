import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { ITokenRole } from '@digitaldefiance/suite-core-lib';

/**
 * Front-end Base interface for token role collection documents
 */
export type IFrontendTokenRole = ITokenRole<string, Date>;
/**
 * Back-end Base interface for token role collection documents
 */
export type IBackendTokenRole<I extends PlatformID = Buffer> = ITokenRole<
  I,
  Date
>;
