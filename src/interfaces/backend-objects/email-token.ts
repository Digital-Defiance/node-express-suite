import {
  EmailTokenType,
  IEmailTokenBase,
} from '@digitaldefiance/suite-core-lib';
import { Types } from '@digitaldefiance/mongoose-types';

export type IEmailTokenBackendObject<I extends string | Types.ObjectId = Types.ObjectId> = IEmailTokenBase<
  I,
  Date,
  EmailTokenType
>;
