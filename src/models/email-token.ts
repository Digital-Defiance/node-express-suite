import { Connection, Schema } from '@digitaldefiance/mongoose-types';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { EmailTokenSchema } from '../schemas/email-token';

export function EmailTokenModel(
  connection: Connection,
  modelName: string = BaseModelName.EmailToken,
  collection: string = SchemaCollection.EmailToken,
  schema: Schema = EmailTokenSchema,
) {
  return connection.model(modelName, schema, collection);
}

export default EmailTokenModel;
