import { Connection, Model, Schema } from '@digitaldefiance/mongoose-types';
import { IMnemonicDocument } from '../documents/mnemonic';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { MnemonicSchema } from '../schemas/mnemonic';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export function MnemonicModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends PlatformID = Buffer,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.Mnemonic as TModelName,
  collection: TCollection = SchemaCollection.Mnemonic as TCollection,
  schema: Schema = MnemonicSchema,
): Model<IMnemonicDocument<I>> {
  return connection.model<IMnemonicDocument<I>>(modelName, schema, collection);
}

export default MnemonicModel;
