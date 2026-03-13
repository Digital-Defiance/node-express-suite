/**
 * @fileoverview Storage-agnostic used direct login token document type.
 * @module interfaces/documents/used-direct-login-token
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IUsedDirectLoginTokenBase } from '@digitaldefiance/suite-core-lib';
import type { BaseDocument } from './base';

/**
 * Storage-agnostic used direct login token document type.
 * Satisfied by both Mongoose documents and BrightDb plain records.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 */
export type UsedDirectLoginTokenDocument<TID extends PlatformID = Buffer> =
  BaseDocument<IUsedDirectLoginTokenBase<TID>, TID>;
