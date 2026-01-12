import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';

export type IUserBackendObject<
  S extends string,
  I extends PlatformID = Buffer,
> = IUserBase<I, Date, S, AccountStatus>;
