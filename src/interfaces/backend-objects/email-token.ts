import {
  EmailTokenType,
  IEmailTokenBase,
} from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';

export type IEmailTokenBackendObject<I extends string | Types.ObjectId = Types.ObjectId> = IEmailTokenBase<
  I,
  Date,
  EmailTokenType
>;
