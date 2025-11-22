import { IUsedDirectLoginTokenBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IBaseDocument } from './base';

export type IUsedDirectLoginTokenDocument<I extends string | Types.ObjectId = Types.ObjectId> = IBaseDocument<
  IUsedDirectLoginTokenBase<I>,
  I
>;
