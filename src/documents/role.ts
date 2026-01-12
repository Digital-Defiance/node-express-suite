import { IRoleBase } from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from './base';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Composite interface for role collection documents
 */
export type IRoleDocument<I extends PlatformID = Buffer> = IBaseDocument<
  IRoleBase<I, Date>,
  I
>;
