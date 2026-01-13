/**
 * @fileoverview User model factory for MongoDB.
 * Creates Mongoose model for user management with authentication.
 * @module models/user
 */

import { Connection, Model, Schema } from '@digitaldefiance/mongoose-types';
import { IUserDocument } from '../documents/user';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UserSchema } from '../schemas/user';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Creates a Mongoose model for user documents.
 * @template TModelName - Model name type (defaults to BaseModelName)
 * @template TCollection - Collection name type (defaults to SchemaCollection)
 * @template I - Platform ID type (defaults to Buffer)
 * @param {Connection} connection - Mongoose connection instance
 * @param {TModelName} modelName - Model name (defaults to 'User')
 * @param {TCollection} collection - Collection name (defaults to 'users')
 * @param {Schema} schema - Mongoose schema (defaults to UserSchema)
 * @returns {Model<IUserDocument<string, I>>} Configured Mongoose model
 */
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
