import { Connection, Model, Schema } from 'mongoose';
import { IUserRoleDocument } from '../documents/user-role';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UserRoleSchema } from '../schemas/user-role';

export default function UserRoleModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.UserRole as TModelName,
  collection: TCollection = SchemaCollection.UserRole as TCollection,
  schema: Schema<IUserRoleDocument> = UserRoleSchema,
): Model<IUserRoleDocument> {
  return connection.model<IUserRoleDocument>(modelName, schema, collection);
}
