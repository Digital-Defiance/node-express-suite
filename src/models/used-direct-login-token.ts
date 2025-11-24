import { Connection, Schema, Types } from 'mongoose';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UsedDirectLoginTokenSchema } from '../schemas/used-direct-login-token';

export function UsedDirectLoginTokenModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.UsedDirectLoginToken as TModelName,
  collection: TCollection = SchemaCollection.UsedDirectLoginToken as TCollection,
  schema: Schema = UsedDirectLoginTokenSchema,
) {
  return connection.model<IUsedDirectLoginTokenDocument<I>>(
    modelName,
    schema,
    collection,
  );
}

export default UsedDirectLoginTokenModel;
