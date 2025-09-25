import { Connection, Schema } from 'mongoose';
import { IEmailTokenDocument } from '../documents/email-token';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { EmailTokenSchema } from '../schemas/email-token';

export function EmailTokenModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.EmailToken as TModelName,
  collection: TCollection = SchemaCollection.EmailToken as TCollection,
  schema: Schema<IEmailTokenDocument> = EmailTokenSchema,
) {
  return connection.model<IEmailTokenDocument>(modelName, schema, collection);
}

export default EmailTokenModel;
