import { Types } from '@digitaldefiance/mongoose-types';
import { IUsedDirectLoginTokenBase } from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from './base';

export type IUsedDirectLoginTokenDocument<
  I extends string | Types.ObjectId = Types.ObjectId,
> = IBaseDocument<IUsedDirectLoginTokenBase<I>, I>;
