import { Schema, Types } from '@digitaldefiance/mongoose-types';
import { IRoleBase, Role } from '@digitaldefiance/suite-core-lib';
import { IRoleDocument } from '../documents/role';
import { BaseModelName } from '../enumerations';
import { IConstants } from '../interfaces';
import { RoleSchemaOptions } from './role';

export function createRoleSchema<
  TRole extends string = Role,
  TModelName extends string = BaseModelName,
  TConstants extends IConstants = IConstants,
  I extends Types.ObjectId | string = Types.ObjectId
>(options?: RoleSchemaOptions<TRole, TModelName>, constants?: TConstants): Schema<IRoleBase<I, Date>, IRoleDocument<I>>;

export const RoleSchema: Schema<IRoleBase<Types.ObjectId, Date>, IRoleDocument<Types.ObjectId>>;
