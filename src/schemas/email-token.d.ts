import { Schema, Types } from '@digitaldefiance/mongoose-types';
import { EmailTokenType, IEmailTokenBase } from '@digitaldefiance/suite-core-lib';
import { IEmailTokenDocument } from '../documents/email-token';
import { BaseModelName } from '../enumerations';
import { IConstants } from '../interfaces';
import { EmailTokenSchemaOptions } from './email-token';

export function createEmailTokenSchema<
  TTokenType extends string = EmailTokenType,
  TModelName extends string = BaseModelName,
  TConstants extends IConstants = IConstants,
  I extends Types.ObjectId | string = Types.ObjectId
>(options?: EmailTokenSchemaOptions<TTokenType, TModelName>, constants?: TConstants): Schema<IEmailTokenBase<I, Date, TTokenType>, IEmailTokenDocument<I>>;

export const EmailTokenSchema: Schema<IEmailTokenBase<Types.ObjectId, Date, EmailTokenType>, IEmailTokenDocument<Types.ObjectId>>;
