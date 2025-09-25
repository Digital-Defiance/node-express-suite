import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';

export type IUserBackendObject<S extends string> = IUserBase<
  Types.ObjectId,
  Date,
  S,
  AccountStatus
>;
