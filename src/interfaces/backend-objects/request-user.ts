import { IRequestUser } from '../request-user';
import { IRoleBackendObject } from './role';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export type IRequestUserBackendObject<
  S extends string,
  I extends PlatformID = Buffer,
> = IRequestUser<I, Array<IRoleBackendObject<any>>, S, Date>;
