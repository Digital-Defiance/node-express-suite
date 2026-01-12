import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IUserRoleBase } from '@digitaldefiance/suite-core-lib';

/**
 * Front-end Base interface for user role collection documents
 */
export type IFrontendUserRole = IUserRoleBase<string, Date>;
/**
 * Back-end Base interface for user role collection documents
 */
export type IBackendUserRole<I extends PlatformID = Buffer> = IUserRoleBase<
  I,
  Date
>;
