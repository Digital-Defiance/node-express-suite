import { Connection, Model, Schema } from '@digitaldefiance/mongoose-types';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UsedDirectLoginTokenSchema } from '../schemas/used-direct-login-token';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export function UsedDirectLoginTokenModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends PlatformID = Buffer,
>(
  connection: Connection,
  modelName?: TModelName,
  collection?: TCollection,
  schema?: Schema,
): Model<IUsedDirectLoginTokenDocument<I>>;

export function UsedDirectLoginTokenModel<I extends PlatformID = Buffer>(
  connection: Connection,
  modelName?: string,
  collection?: string,
  schema?: Schema,
): Model<IUsedDirectLoginTokenDocument<I>> {
  return connection.model<IUsedDirectLoginTokenDocument<I>>(
    modelName ?? BaseModelName.UsedDirectLoginToken,
    schema ?? UsedDirectLoginTokenSchema,
    collection ?? SchemaCollection.UsedDirectLoginToken,
  );
}

export default UsedDirectLoginTokenModel;
