import { Schema, Types } from 'mongoose';
import { IUserRoleBase } from '@digitaldefiance/suite-core-lib';
import { IUserRoleDocument } from '../documents/user-role';
import { BaseModelName } from '../enumerations';
import { IConstants } from '../interfaces';
import { UserRoleSchemaOptions } from './user-role';

export function createUserRoleSchema<
  TModelName extends string = BaseModelName,
  TConstants extends IConstants = IConstants,
  I extends string | Types.ObjectId = Types.ObjectId
>(options?: UserRoleSchemaOptions<TModelName>, constants?: TConstants): Schema<IUserRoleBase<I, Date>, IUserRoleDocument<I>>;

export const UserRoleSchema: Schema<IUserRoleBase<Types.ObjectId, Date>, IUserRoleDocument<Types.ObjectId>>;
