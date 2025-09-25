import { Connection, Schema } from 'mongoose';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UsedDirectLoginTokenSchema } from '../schemas/used-direct-login-token';

export function UsedDirectLoginTokenModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.UsedDirectLoginToken as TModelName,
  collection: TCollection = SchemaCollection.UsedDirectLoginToken as TCollection,
  schema: Schema<IUsedDirectLoginTokenDocument> = UsedDirectLoginTokenSchema,
) {
  return connection.model<IUsedDirectLoginTokenDocument>(
    modelName,
    schema,
    collection,
  );
}

export default UsedDirectLoginTokenModel;
