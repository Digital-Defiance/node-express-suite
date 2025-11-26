import { Connection, Model, Schema, Types } from '@digitaldefiance/mongoose-types';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';

export function UsedDirectLoginTokenModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId
>(connection: Connection, modelName?: TModelName, collection?: TCollection, schema?: Schema): Model<IUsedDirectLoginTokenDocument<I>>;

export default UsedDirectLoginTokenModel;
