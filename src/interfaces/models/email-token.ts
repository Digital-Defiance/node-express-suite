import { IEmailTokenBase } from '@digitaldefiance/suite-core-lib';

/**
 * Front-End Base interface for email token collection documents
 */
export type IFrontendEmailToken = IEmailTokenBase<string, Date, string>;
