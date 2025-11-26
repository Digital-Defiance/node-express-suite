import { Types } from '@digitaldefiance/mongoose-types';
import { ITokenRole } from '@digitaldefiance/suite-core-lib';

/**
 * Front-end Base interface for token role collection documents
 */
export type IFrontendTokenRole = ITokenRole<string, Date>;
/**
 * Back-end Base interface for token role collection documents
 */
export type IBackendTokenRole<I = Types.ObjectId> = ITokenRole<I, Date>;
