/**
 * @fileoverview Backend email token object type.
 * Defines email token type for backend operations.
 * @module interfaces/backend-objects/email-token
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  EmailTokenType,
  IEmailTokenBase,
} from '@digitaldefiance/suite-core-lib';

/**
 * Backend email token object type.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export type IEmailTokenBackendObject<TID extends PlatformID = Buffer> =
  IEmailTokenBase<TID, Date, EmailTokenType>;
