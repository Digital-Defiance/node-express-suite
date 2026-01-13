/**
 * @fileoverview Used direct login token model factory for MongoDB.
 * Creates Mongoose model for tracking consumed direct login tokens.
 * @module models/used-direct-login-token
 */

import { Connection, Model, Schema } from '@digitaldefiance/mongoose-types';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { BaseModelName } from '../enumerations';
import { SchemaCollection } from '../enumerations/schema-collection';
import { UsedDirectLoginTokenSchema } from '../schemas/used-direct-login-token';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Creates a Mongoose model for used direct login token documents.
 * @template TModelName - Model name type (defaults to BaseModelName)
 * @template TCollection - Collection name type (defaults to SchemaCollection)
 * @template I - Platform ID type (defaults to Buffer)
 * @param {Connection} connection - Mongoose connection instance
 * @param {TModelName} [modelName] - Model name (defaults to 'UsedDirectLoginToken')
 * @param {TCollection} [collection] - Collection name (defaults to 'usedDirectLoginTokens')
 * @param {Schema} [schema] - Mongoose schema (defaults to UsedDirectLoginTokenSchema)
 * @returns {Model<IUsedDirectLoginTokenDocument<I>>} Configured Mongoose model
 */
export function UsedDirectLoginTokenModel<
  TModelName extends string = BaseModelName,
  TCollection extends string = SchemaCollection,
  I extends PlatformID = Buffer,
>(
  connection: Connection,
  modelName?: TModelName,
  collection?: TCollection,
  schema?: Schema,
): Model<IUsedDirectLoginTokenDocument<I>>;

export function UsedDirectLoginTokenModel<I extends PlatformID = Buffer>(
  connection: Connection,
  modelName?: string,
  collection?: string,
  schema?: Schema,
): Model<IUsedDirectLoginTokenDocument<I>> {
  return connection.model<IUsedDirectLoginTokenDocument<I>>(
    modelName ?? BaseModelName.UsedDirectLoginToken,
    schema ?? UsedDirectLoginTokenSchema,
    collection ?? SchemaCollection.UsedDirectLoginToken,
  );
}

export default UsedDirectLoginTokenModel;
