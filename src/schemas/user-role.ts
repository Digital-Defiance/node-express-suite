import { Schema, Types } from 'mongoose';
import { IUserRoleBase } from '@digitaldefiance/suite-core-lib';
import { IUserRoleDocument } from '../documents/user-role';
import { BaseModelName } from '../enumerations';
import { IConstants } from '../interfaces';

/**
 * Configuration options for creating a user-role schema
 */
export interface UserRoleSchemaOptions<
  TModelName extends string = BaseModelName,
> {
  /** Model name for user reference */
  userModelName?: TModelName;
  /** Model name for role reference */
  roleModelName?: TModelName;
  /** ID type for references */
  idType?: any;
}

/**
 * Factory function to create an extensible user-role schema
 */
export function createUserRoleSchema<
  TModelName extends string = BaseModelName,
  TConstants extends IConstants = IConstants,
  I extends string | Types.ObjectId = Types.ObjectId
>(
  options: UserRoleSchemaOptions<TModelName> = {},
  constants?: TConstants
): Schema {
  const {
    userModelName = BaseModelName.User as TModelName,
    roleModelName = BaseModelName.Role as TModelName,
    idType = Schema.Types.ObjectId,
  } = options;

  const definition = {
    userId: {
      type: idType,
      ref: userModelName,
      required: true,
    },
    roleId: {
      type: idType,
      ref: roleModelName,
      required: true,
    },
    createdBy: {
      type: idType,
      ref: userModelName,
      required: true,
      immutable: true,
    },
    updatedBy: {
      type: idType,
      ref: userModelName,
      required: true,
    },
    deletedAt: {
      type: Date,
      optional: true,
    },
    deletedBy: {
      type: idType,
      ref: userModelName,
      required: false,
      optional: true,
    },
  };

  const schema = new Schema(definition, { timestamps: true });
  schema.index({ userId: 1, roleId: 1 }, { unique: true });
  schema.index({ userId: 1 });
  schema.index({ roleId: 1 });
  return schema as Schema<IUserRoleBase<I, Date>, IUserRoleDocument<I>>;
}

/**
 * Default user-role schema with base configuration
 */
export const UserRoleSchema = createUserRoleSchema();
