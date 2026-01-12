import {
  EmailTokenType,
  IEmailTokenBase,
} from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from './base';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Composite interface for email token collection documents
 */
export type IEmailTokenDocument<I extends PlatformID = Buffer> = IBaseDocument<
  IEmailTokenBase<I, Date, EmailTokenType>,
  I
>;
