import { Schema } from 'mongoose';
import { IUserRoleDocument } from '../documents/user-role';
import { BaseModelName } from '../enumerations';

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
}

/**
 * Factory function to create an extensible user-role schema
 */
export function createUserRoleSchema<TModelName extends string = BaseModelName>(
  options: UserRoleSchemaOptions<TModelName> = {},
): Schema<IUserRoleDocument> {
  const {
    userModelName = BaseModelName.User as TModelName,
    roleModelName = BaseModelName.Role as TModelName,
  } = options;

  const schema = new Schema<IUserRoleDocument>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: userModelName,
        required: true,
      },
      roleId: {
        type: Schema.Types.ObjectId,
        ref: roleModelName,
        required: true,
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: userModelName,
        required: true,
        immutable: true,
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: userModelName,
        required: true,
      },
      deletedAt: {
        type: Date,
        optional: true,
      },
      deletedBy: {
        type: Schema.Types.ObjectId,
        ref: userModelName,
        required: false,
        optional: true,
      },
    },
    { timestamps: true },
  );

  schema.index({ userId: 1, roleId: 1 }, { unique: true });
  schema.index({ userId: 1 });
  schema.index({ roleId: 1 });

  return schema;
}

/**
 * Default user-role schema with base configuration
 */
export const UserRoleSchema = createUserRoleSchema();
