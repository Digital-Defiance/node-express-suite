import { Connection, Model, Schema, Types } from 'mongoose';
import { IUserRoleDocument } from '../documents/user-role';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UserRoleSchema } from '../schemas/user-role';

export default function UserRoleModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.UserRole as TModelName,
  collection: TCollection = SchemaCollection.UserRole as TCollection,
  schema: Schema = UserRoleSchema,
): Model<IUserRoleDocument<I>> {
  return connection.model<IUserRoleDocument<I>>(modelName, schema, collection);
}
