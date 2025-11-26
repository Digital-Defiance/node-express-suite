import { Connection, Model, Schema, Types } from '@digitaldefiance/mongoose-types';
import { IRoleDocument } from '../documents/role';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';

export function RoleModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId
>(connection: Connection, modelName?: TModelName, collection?: TCollection, schema?: Schema): Model<IRoleDocument<I>>;

export default RoleModel;
