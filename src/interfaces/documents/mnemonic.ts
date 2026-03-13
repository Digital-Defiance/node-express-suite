/**
 * @fileoverview Storage-agnostic mnemonic document type.
 * @module interfaces/documents/mnemonic
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IMnemonicBase } from '@digitaldefiance/suite-core-lib';
import type { BaseDocument } from './base';

/**
 * Storage-agnostic mnemonic document type.
 * Satisfied by both Mongoose documents and BrightDb plain records.
 *
 * @template TID - Platform ID type (defaults to Buffer)
 */
export type MnemonicDocument<TID extends PlatformID = Buffer> = BaseDocument<
  IMnemonicBase<TID>,
  TID
>;
