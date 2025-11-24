import { Connection, Schema, Types } from 'mongoose';
import { IMnemonicDocument } from '../documents/mnemonic';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { MnemonicSchema } from '../schemas/mnemonic';

export function MnemonicModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.Mnemonic as TModelName,
  collection: TCollection = SchemaCollection.Mnemonic as TCollection,
  schema: Schema = MnemonicSchema,
) {
  return connection.model<IMnemonicDocument<I>>(modelName, schema, collection);
}

export default MnemonicModel;
