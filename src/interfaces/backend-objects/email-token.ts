import { Types } from '@digitaldefiance/mongoose-types';
import {
  EmailTokenType,
  IEmailTokenBase,
} from '@digitaldefiance/suite-core-lib';

export type IEmailTokenBackendObject<
  I extends string | Types.ObjectId = Types.ObjectId,
> = IEmailTokenBase<I, Date, EmailTokenType>;
