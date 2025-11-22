import { Types } from 'mongoose';
import { Schema } from 'mongoose';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { BaseModelName } from '../enumerations';
import { IConstants } from '../interfaces';

/**
 * Configuration options for creating a used direct login token schema
 */
export interface UsedDirectLoginTokenSchemaOptions<
  TModelName extends string = BaseModelName,
> {
  /** Model name for user reference */
  userModelName?: TModelName;
  /** ID type for references */
  idType?: any;
}

/**
 * Factory function to create an extensible used direct login token schema
 */
export function createUsedDirectLoginTokenSchema<
  TModelName extends string = BaseModelName,
  TConstants extends IConstants = IConstants,
  I extends Types.ObjectId | string = Types.ObjectId
>(
  options: UsedDirectLoginTokenSchemaOptions<TModelName> = {},
  constants?: TConstants,
): Schema<IUsedDirectLoginTokenDocument<I>> {
  const { userModelName = BaseModelName.User as TModelName, idType = Schema.Types.ObjectId } = options;

  const schema = new Schema<IUsedDirectLoginTokenDocument<I>>({
    userId: { type: idType, required: true, ref: userModelName },
    token: { type: String, required: true },
  });

  schema.index({ userId: 1, token: 1 }, { unique: true });

  return schema;
}

/**
 * Default used direct login token schema with base configuration
 */
export const UsedDirectLoginTokenSchema = createUsedDirectLoginTokenSchema();
