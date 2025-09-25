import {
  EmailTokenType,
  IEmailTokenBase,
} from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IBaseDocument } from './base';

/**
 * Composite interface for email token collection documents
 */
export type IEmailTokenDocument = IBaseDocument<
  IEmailTokenBase<Types.ObjectId, Date, EmailTokenType>,
  Types.ObjectId
>;
