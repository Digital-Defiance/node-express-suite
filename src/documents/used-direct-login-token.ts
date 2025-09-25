import { IUsedDirectLoginTokenBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { IBaseDocument } from './base';

export type IUsedDirectLoginTokenDocument = IBaseDocument<
  IUsedDirectLoginTokenBase<Types.ObjectId>
>;
