import { Types } from '@digitaldefiance/mongoose-types';
import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';

export type IUserBackendObject<
  S extends string,
  I = Types.ObjectId,
> = IUserBase<I, Date, S, AccountStatus>;
