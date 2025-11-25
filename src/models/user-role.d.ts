import { Connection, Model, Schema, Types } from 'mongoose';
import { IUserRoleDocument } from '../documents/user-role';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';

export default function UserRoleModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId
>(connection: Connection, modelName?: TModelName, collection?: TCollection, schema?: Schema): Model<IUserRoleDocument<I>>;
