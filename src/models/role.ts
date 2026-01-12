import { Connection, Model, Schema } from '@digitaldefiance/mongoose-types';
import { IRoleDocument } from '../documents/role';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { RoleSchema } from '../schemas/role';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export function RoleModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends PlatformID = Buffer,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.Role as TModelName,
  collection: TCollection = SchemaCollection.Role as TCollection,
  schema: Schema = RoleSchema,
): Model<IRoleDocument<I>> {
  return connection.model<IRoleDocument<I>>(modelName, schema, collection);
}

export default RoleModel;
