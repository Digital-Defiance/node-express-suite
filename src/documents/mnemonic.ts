import { IMnemonicBase } from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from './base';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Composite interface for user collection documents
 */
export type IMnemonicDocument<I extends PlatformID = Buffer> = IBaseDocument<
  IMnemonicBase<I>,
  I
>;
