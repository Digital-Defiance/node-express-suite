import { Types } from '@digitaldefiance/mongoose-types';
import {
  EmailTokenType,
  IEmailTokenBase,
} from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from './base';

/**
 * Composite interface for email token collection documents
 */
export type IEmailTokenDocument<
  I extends string | Types.ObjectId = Types.ObjectId,
> = IBaseDocument<IEmailTokenBase<I, Date, EmailTokenType>, I>;
