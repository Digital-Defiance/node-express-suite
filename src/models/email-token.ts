import { Connection, Model, Schema } from '@digitaldefiance/mongoose-types';
import { IEmailTokenDocument } from '../documents/email-token';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { EmailTokenSchema } from '../schemas/email-token';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export function EmailTokenModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends PlatformID = Buffer,
>(
  connection: Connection,
  modelName?: TModelName,
  collection?: TCollection,
  schema?: Schema,
): Model<IEmailTokenDocument<I>>;

export function EmailTokenModel<I extends PlatformID = Buffer>(
  connection: Connection,
  modelName: string = BaseModelName.EmailToken,
  collection: string = SchemaCollection.EmailToken,
  schema: Schema = EmailTokenSchema,
) {
  return connection.model<IEmailTokenDocument<I>>(
    modelName,
    schema,
    collection,
  );
}

export default EmailTokenModel;
