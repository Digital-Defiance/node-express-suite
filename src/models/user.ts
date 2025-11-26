import { Connection, Model, Schema, Types } from '@digitaldefiance/mongoose-types';
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UserSchema } from '../schemas/user';

export function UserModel(
  connection: Connection,
  modelName: string = BaseModelName.User,
  collection: string = SchemaCollection.User,
  schema: Schema = UserSchema,
): Model<any> {
  return connection.model(modelName, schema, collection);
}

export default UserModel;
