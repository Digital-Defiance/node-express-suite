import { Connection, Schema, Types } from 'mongoose';
import { IEmailTokenDocument } from '../documents/email-token';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { EmailTokenSchema } from '../schemas/email-token';

export function EmailTokenModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.EmailToken as TModelName,
  collection: TCollection = SchemaCollection.EmailToken as TCollection,
  schema: Schema = EmailTokenSchema,
) {
  return connection.model<IEmailTokenDocument<I>>(modelName, schema, collection);
}

export default EmailTokenModel;
