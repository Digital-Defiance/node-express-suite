import { Connection, Model, Schema, Types } from 'mongoose';
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UserSchema } from '../schemas/user';

export function UserModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.User as TModelName,
  collection: TCollection = SchemaCollection.User as TCollection,
  schema: Schema = UserSchema,
): Model<IUserDocument<string, I>> {
  return connection.model<IUserDocument<string, I>>(modelName, schema, collection);
}

export default UserModel;
