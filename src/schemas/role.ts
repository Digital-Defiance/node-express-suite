import { CallbackWithoutResultAndOptionalError, Schema, Types } from 'mongoose';
import {
  IRoleBase,
  Role,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { IRoleDocument } from '../documents/role';
import { BaseModelName } from '../enumerations';
import { IConstants } from '../interfaces';

/**
 * Configuration options for creating a role schema
 */
export interface RoleSchemaOptions<
  TRole extends string = Role,
  TModelName extends string = BaseModelName,
> {
  /** Role enum values to use */
  roleEnum?: TRole[];
  /** Model name for user reference */
  userModelName?: TModelName;
  /** Custom pre-save validation function */
  customValidation?: <T = any>(
    doc: T,
    next: CallbackWithoutResultAndOptionalError,
  ) => void;
  /** ID type for references */
  idType?: any;
}

/**
 * Factory function to create an extensible role schema
 */
export function createRoleSchema<
  TRole extends string = Role,
  TModelName extends string = BaseModelName,
  TConstants extends IConstants = IConstants
>(options: RoleSchemaOptions<TRole, TModelName> = {}, constants: TConstants = {} as TConstants): Schema {
  const {
    roleEnum = Object.values(Role) as TRole[],
    userModelName = BaseModelName.User as TModelName,
    customValidation,
    idType = Schema.Types.ObjectId,
  } = options;

  const definition = {
    name: {
      type: String,
      enum: roleEnum,
      required: true,
      immutable: true,
    },
    admin: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    member: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    child: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    system: {
      type: Boolean,
      default: false,
      immutable: true,
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
      get: (v: Date) => v,
      set: (v: Date) => new Date(v.toUTCString()),
    },
    deletedBy: {
      type: idType,
      ref: userModelName,
      required: false,
      optional: true,
    },
  };

  const schema = new Schema(definition, { timestamps: true });
  schema.index({ name: 1 }, { unique: true });

  schema.pre('save', function (next: CallbackWithoutResultAndOptionalError) {
    const doc = this;
    if (customValidation) {
      customValidation(doc, next);
    } else {
      // Default validation
      if (doc.admin && doc.child) {
        return next(
          new TranslatableSuiteError(
            SuiteCoreStringKey.Error_ChildRoleCannotBeAnAdminRole,
          ),
        );
      }
      if (doc.system && doc.child) {
        return next(
          new TranslatableSuiteError(
            SuiteCoreStringKey.Error_ChildRoleCannotBeASystemRole,
          ),
        );
      }
      next();
    }
  });

  return schema;
}

/**
 * Default role schema with base configuration
 */
export const RoleSchema = createRoleSchema();
