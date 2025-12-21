import { Connection, Schema } from '@digitaldefiance/mongoose-types';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { MnemonicSchema } from '../schemas/mnemonic';

export function MnemonicModel(
  connection: Connection,
  modelName: string = BaseModelName.Mnemonic,
  collection: string = SchemaCollection.Mnemonic,
  schema: Schema = MnemonicSchema,
) {
  return connection.model(modelName, schema, collection);
}

export default MnemonicModel;
