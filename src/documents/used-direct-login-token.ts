import { IUsedDirectLoginTokenBase } from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from './base';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

export type IUsedDirectLoginTokenDocument<I extends PlatformID = Buffer> =
  IBaseDocument<IUsedDirectLoginTokenBase<I>, I>;
