import { Types } from 'mongoose';
import { IRequestUser } from '../request-user';
import { IRoleBackendObject } from './role';

export type IRequestUserBackendObject<S extends string> = IRequestUser<
  Types.ObjectId,
  Array<IRoleBackendObject>,
  S,
  Date
>;
