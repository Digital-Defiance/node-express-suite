import { Schema, Types } from 'mongoose';
import { IUsedDirectLoginTokenBase } from '@digitaldefiance/suite-core-lib';
import { IUsedDirectLoginTokenDocument } from '../documents/used-direct-login-token';
import { BaseModelName } from '../enumerations';
import { IConstants } from '../interfaces';
import { UsedDirectLoginTokenSchemaOptions } from './used-direct-login-token';

export function createUsedDirectLoginTokenSchema<
  TModelName extends string = BaseModelName,
  TConstants extends IConstants = IConstants,
  I extends Types.ObjectId | string = Types.ObjectId
>(options?: UsedDirectLoginTokenSchemaOptions<TModelName>, constants?: TConstants): Schema<IUsedDirectLoginTokenBase<I>, IUsedDirectLoginTokenDocument<I>>;

export const UsedDirectLoginTokenSchema: Schema<IUsedDirectLoginTokenBase<Types.ObjectId>, IUsedDirectLoginTokenDocument<Types.ObjectId>>;
