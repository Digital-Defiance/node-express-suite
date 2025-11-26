import { Types } from '@digitaldefiance/mongoose-types';
import { IUserRoleBase } from '@digitaldefiance/suite-core-lib';

/**
 * Front-end Base interface for user role collection documents
 */
export type IFrontendUserRole = IUserRoleBase<string, Date>;
/**
 * Back-end Base interface for user role collection documents
 */
export type IBackendUserRole<I = Types.ObjectId> = IUserRoleBase<I, Date>;
