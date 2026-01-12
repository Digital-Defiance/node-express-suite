import { Connection, Model, Schema } from '@digitaldefiance/mongoose-types';
import { IUserRoleDocument } from '../documents/user-role';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UserRoleSchema } from '../schemas/user-role';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export default function UserRoleModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends PlatformID = Buffer,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.UserRole as TModelName,
  collection: TCollection = SchemaCollection.UserRole as TCollection,
  schema: Schema = UserRoleSchema,
): Model<IUserRoleDocument<I>> {
  return connection.model<IUserRoleDocument<I>>(modelName, schema, collection);
}
