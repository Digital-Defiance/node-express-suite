import { Connection, Model, Schema, Types } from '@digitaldefiance/mongoose-types';
import { IMnemonicDocument } from '../documents/mnemonic';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';

export function MnemonicModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId
>(connection: Connection, modelName?: TModelName, collection?: TCollection, schema?: Schema): Model<IMnemonicDocument<I>>;

export default MnemonicModel;
