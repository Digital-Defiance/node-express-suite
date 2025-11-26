import { Connection, Schema, Types } from '@digitaldefiance/mongoose-types';
import { IRoleDocument } from '../documents/role';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { RoleSchema } from '../schemas/role';

export function RoleModel(
  connection: Connection,
  modelName: string = BaseModelName.Role,
  collection: string = SchemaCollection.Role,
  schema: Schema = RoleSchema,
) {
  return connection.model(modelName, schema, collection);
}

export default RoleModel;
