/**
 * @fileoverview Storage-agnostic email token document type.
 * @module interfaces/documents/email-token
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type {
  EmailTokenType,
  IEmailTokenBase,
} from '@digitaldefiance/suite-core-lib';
import type { BaseDocument } from './base';

/**
 * Storage-agnostic email token document type.
 * Satisfied by both Mongoose documents and BrightDb plain records.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 */
export type EmailTokenDocument<TID extends PlatformID = Buffer> = BaseDocument<
  IEmailTokenBase<TID, Date, EmailTokenType>,
  TID
>;
