import { Connection, Schema } from 'mongoose';
import {
  IEmailTokenDocument,
  IMnemonicDocument,
  IRoleDocument,
  IUserDocument,
  IUserRoleDocument,
} from '../documents';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import EmailTokenModel from '../models/email-token';
import MnemonicModel from '../models/mnemonic';
import RoleModel from '../models/role';
import UsedDirectLoginTokenModel from '../models/used-direct-login-token';
import UserModel from '../models/user';
import UserRoleModel from '../models/user-role';
import { SchemaMap } from '../types';
import { EmailTokenSchema, createEmailTokenSchema } from './email-token';
import { MnemonicSchema, createMnemonicSchema } from './mnemonic';
import { RoleSchema, createRoleSchema } from './role';
import { UsedDirectLoginTokenSchema, createUsedDirectLoginTokenSchema } from './used-direct-login-token';
import { UserSchema, createUserSchema } from './user';
import { UserRoleSchema, createUserRoleSchema } from './user-role';
import { IConstants } from '../interfaces';

export interface BaseModelDocs {
  EmailToken: IEmailTokenDocument;
  Mnemonic: IMnemonicDocument;
  Role: IRoleDocument;
  UsedDirectLoginToken: IUsedDirectLoginTokenDocument;
  User: IUserDocument;
  UserRole: IUserRoleDocument;
}

export interface SchemaMapOptions {
  constants?: IConstants;
  schemas?: {
    EmailToken?: Schema<IEmailTokenDocument>;
    Mnemonic?: Schema<IMnemonicDocument>;
    Role?: Schema<IRoleDocument>;
    UsedDirectLoginToken?: Schema<IUsedDirectLoginTokenDocument>;
    User?: Schema<IUserDocument>;
    UserRole?: Schema<IUserRoleDocument>;
  };
  modelNames?: {
    EmailToken?: string;
    Mnemonic?: string;
    Role?: string;
    UsedDirectLoginToken?: string;
    User?: string;
    UserRole?: string;
  };
  collections?: {
    EmailToken?: string;
    Mnemonic?: string;
    Role?: string;
    UsedDirectLoginToken?: string;
    User?: string;
    UserRole?: string;
  };
}

export function getSchemaMap(
  connection: Connection,
  options: SchemaMapOptions = {},
): SchemaMap<BaseModelDocs> {
  const schemas = options.schemas ?? {
    EmailToken: createEmailTokenSchema(undefined, options?.constants),
    Mnemonic: createMnemonicSchema(undefined, options?.constants),
    Role: createRoleSchema(undefined, options?.constants),
    UsedDirectLoginToken: createUsedDirectLoginTokenSchema(undefined, options?.constants),
    User: createUserSchema(undefined, undefined, undefined, undefined, undefined, options?.constants),
    UserRole: createUserRoleSchema(undefined, options?.constants),
  };
  const { modelNames = {}, collections = {} } = options;

  return {
    EmailToken: {
      collection: collections.EmailToken ?? SchemaCollection.EmailToken,
      model: EmailTokenModel(
        connection,
        modelNames.EmailToken ?? BaseModelName.EmailToken,
        collections.EmailToken ?? SchemaCollection.EmailToken,
        schemas.EmailToken,
      ),
      modelName: modelNames.EmailToken ?? BaseModelName.EmailToken,
      schema: schemas.EmailToken ?? EmailTokenSchema,
    },
    Mnemonic: {
      collection: collections.Mnemonic ?? SchemaCollection.Mnemonic,
      model: MnemonicModel(
        connection,
        modelNames.Mnemonic ?? BaseModelName.Mnemonic,
        collections.Mnemonic ?? SchemaCollection.Mnemonic,
        schemas.Mnemonic,
      ),
      modelName: modelNames.Mnemonic ?? BaseModelName.Mnemonic,
      schema: schemas.Mnemonic ?? MnemonicSchema,
    },
    Role: {
      collection: collections.Role ?? SchemaCollection.Role,
      model: RoleModel(
        connection,
        modelNames.Role ?? BaseModelName.Role,
        collections.Role ?? SchemaCollection.Role,
        schemas.Role,
      ),
      modelName: modelNames.Role ?? BaseModelName.Role,
      schema: schemas.Role ?? RoleSchema,
    },
    UsedDirectLoginToken: {
      collection:
        collections.UsedDirectLoginToken ??
        SchemaCollection.UsedDirectLoginToken,
      model: UsedDirectLoginTokenModel(
        connection,
        modelNames.UsedDirectLoginToken ?? BaseModelName.UsedDirectLoginToken,
        collections.UsedDirectLoginToken ??
          SchemaCollection.UsedDirectLoginToken,
        schemas.UsedDirectLoginToken,
      ),
      modelName:
        modelNames.UsedDirectLoginToken ?? BaseModelName.UsedDirectLoginToken,
      schema: schemas.UsedDirectLoginToken ?? UsedDirectLoginTokenSchema,
    },
    User: {
      collection: collections.User ?? SchemaCollection.User,
      model: UserModel(
        connection,
        modelNames.User ?? BaseModelName.User,
        collections.User ?? SchemaCollection.User,
        schemas.User,
      ),
      modelName: modelNames.User ?? BaseModelName.User,
      schema: schemas.User ?? UserSchema,
    },
    UserRole: {
      collection: collections.UserRole ?? SchemaCollection.UserRole,
      model: UserRoleModel(
        connection,
        modelNames.UserRole ?? BaseModelName.UserRole,
        collections.UserRole ?? SchemaCollection.UserRole,
        schemas.UserRole,
      ),
      modelName: modelNames.UserRole ?? BaseModelName.UserRole,
      schema: schemas.UserRole ?? UserRoleSchema,
    },
  } as SchemaMap<BaseModelDocs>;
}
