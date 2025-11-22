import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';

export type IUserBackendObject<
  S extends string,
  I = Types.ObjectId,
> = IUserBase<I, Date, S, AccountStatus>;
