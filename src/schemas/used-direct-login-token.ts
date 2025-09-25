import { Schema } from 'mongoose';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { BaseModelName } from '../enumerations';

/**
 * Configuration options for creating a used direct login token schema
 */
export interface UsedDirectLoginTokenSchemaOptions<
  TModelName extends string = BaseModelName,
> {
  /** Model name for user reference */
  userModelName?: TModelName;
}

/**
 * Factory function to create an extensible used direct login token schema
 */
export function createUsedDirectLoginTokenSchema<
  TModelName extends string = BaseModelName,
>(
  options: UsedDirectLoginTokenSchemaOptions<TModelName> = {},
): Schema<IUsedDirectLoginTokenDocument> {
  const { userModelName = BaseModelName.User as TModelName } = options;

  const schema = new Schema<IUsedDirectLoginTokenDocument>({
    userId: { type: Schema.Types.ObjectId, required: true, ref: userModelName },
    token: { type: String, required: true },
  });

  schema.index({ userId: 1, token: 1 }, { unique: true });

  return schema;
}

/**
 * Default used direct login token schema with base configuration
 */
export const UsedDirectLoginTokenSchema = createUsedDirectLoginTokenSchema();
