import { IUserRoleBase } from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from './base';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Composite interface for user-role collection documents
 */
export type IUserRoleDocument<I extends PlatformID = Buffer> = IBaseDocument<
  IUserRoleBase<I, Date>,
  I
>;
