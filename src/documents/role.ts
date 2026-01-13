/**
 * @fileoverview Role document interface for Mongoose role model.
 * Combines base document with role-specific fields and permissions.
 * @module documents/role
 */

import { IRoleBase } from '@digitaldefiance/suite-core-lib';
import { IBaseDocument } from './base';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

/**
 * Role document interface for MongoDB role collection.
 * @template I - Platform ID type (defaults to Buffer)
 * @typedef {IBaseDocument<IRoleBase<I, Date>, I>} IRoleDocument
 */
export type IRoleDocument<I extends PlatformID = Buffer> = IBaseDocument<
  IRoleBase<I, Date>,
  I
>;
