import { Connection, Model, Schema, Types } from 'mongoose';
import { IEmailTokenDocument } from '../documents/email-token';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';

export function EmailTokenModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends string | Types.ObjectId = Types.ObjectId
>(connection: Connection, modelName?: TModelName, collection?: TCollection, schema?: Schema): Model<IEmailTokenDocument<I>>;

export default EmailTokenModel;
