import { Types } from 'mongoose';
import { IRequestUser } from '../request-user';
import { IRoleBackendObject } from './role';

export type IRequestUserBackendObject<
  S extends string,
  I extends Types.ObjectId | string = Types.ObjectId,
> = IRequestUser<I, Array<IRoleBackendObject<any>>, S, Date>;
