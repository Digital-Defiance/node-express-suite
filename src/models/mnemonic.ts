import { Connection, Schema } from 'mongoose';
import { IMnemonicDocument } from '../documents/mnemonic';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { MnemonicSchema } from '../schemas/mnemonic';

export function MnemonicModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.Mnemonic as TModelName,
  collection: TCollection = SchemaCollection.Mnemonic as TCollection,
  schema: Schema<IMnemonicDocument> = MnemonicSchema,
) {
  return connection.model<IMnemonicDocument>(modelName, schema, collection);
}

export default MnemonicModel;
