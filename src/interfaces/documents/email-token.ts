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
 * @template TDate - Date type (defaults to Date)
 */
export type EmailTokenDocument<
  TID extends PlatformID = Buffer,
  TDate extends Date | number = Date,
> = BaseDocument<IEmailTokenBase<TID, TDate, EmailTokenType>, TID>;
