import { Connection, Schema, Types } from 'mongoose';
import { IRoleDocument } from '../documents/role';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { RoleSchema } from '../schemas/role';

export function RoleModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.Role as TModelName,
  collection: TCollection = SchemaCollection.Role as TCollection,
  schema: Schema = RoleSchema,
) {
  return connection.model<IRoleDocument<I>>(modelName, schema, collection);
}

export default RoleModel;
