import { Connection, Schema } from 'mongoose';
import { IRoleDocument } from '../documents/role';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { RoleSchema } from '../schemas/role';

export function RoleModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.Role as TModelName,
  collection: TCollection = SchemaCollection.Role as TCollection,
  schema: Schema<IRoleDocument> = RoleSchema,
) {
  return connection.model<IRoleDocument>(modelName, schema, collection);
}

export default RoleModel;
