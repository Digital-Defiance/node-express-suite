import { Connection, Model, Schema } from 'mongoose';
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UserSchema } from '../schemas/user';

export function UserModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.User as TModelName,
  collection: TCollection = SchemaCollection.User as TCollection,
  schema: Schema<IUserDocument> = UserSchema,
): Model<IUserDocument> {
  return connection.model<IUserDocument>(modelName, schema, collection);
}

export default UserModel;
