import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IUsedDirectLoginTokenBase } from '@digitaldefiance/suite-core-lib';

/**
 * Base interface for front-end used direct login token collection documents
 */
export type IFrontendUsedDirectLoginToken = IUsedDirectLoginTokenBase<string>;
/**
 * Base interface for back-end used direct login token collection documents
 */
export type IBackendUsedDirectLoginToken<I extends PlatformID = Buffer> =
  IUsedDirectLoginTokenBase<I>;
