import { Connection, Schema } from '@digitaldefiance/mongoose-types';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UsedDirectLoginTokenSchema } from '../schemas/used-direct-login-token';

export function UsedDirectLoginTokenModel(
  connection: Connection,
  modelName: string = BaseModelName.UsedDirectLoginToken,
  collection: string = SchemaCollection.UsedDirectLoginToken,
  schema: Schema = UsedDirectLoginTokenSchema,
) {
  return connection.model(modelName, schema, collection);
}

export default UsedDirectLoginTokenModel;
