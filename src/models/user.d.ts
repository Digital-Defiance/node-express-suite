import { Connection, Model, Schema, Types } from 'mongoose';
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';

export function UserModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId
>(
  connection: Connection,
  modelName?: TModelName,
  collection?: TCollection,
  schema?: Schema,
): Model<IUserDocument<string, I>>;

export default UserModel;
