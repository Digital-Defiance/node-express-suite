import { Connection, Model, Schema, Types } from 'mongoose';
import { IUserRoleDocument } from '../documents/user-role';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UserRoleSchema } from '../schemas/user-role';

export default function UserRoleModel(
  connection: Connection,
  modelName: string = BaseModelName.UserRole,
  collection: string = SchemaCollection.UserRole,
  schema: Schema = UserRoleSchema,
): Model<any> {
  return connection.model(modelName, schema, collection);
}
