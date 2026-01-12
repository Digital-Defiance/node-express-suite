import { Connection, Model, Schema } from '@digitaldefiance/mongoose-types';
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UserSchema } from '../schemas/user';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export function UserModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends PlatformID = Buffer,
>(
  connection: Connection,
  modelName: TModelName = BaseModelName.User as TModelName,
  collection: TCollection = SchemaCollection.User as TCollection,
  schema: Schema = UserSchema,
): Model<IUserDocument<string, I>> {
  return connection.model<IUserDocument<string, I>>(
    modelName,
    schema,
    collection,
  );
}

export default UserModel;
