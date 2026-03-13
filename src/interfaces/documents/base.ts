/**
 * @fileoverview Storage-agnostic base document type.
 *
 * Unlike the Mongo variant (which intersects with Mongoose's Document class),
 * this type is a plain data intersection: the domain data shape `T` combined
 * with `IHasId<TID>`. Any storage engine whose records carry `_id` plus the
 * domain fields satisfies this contract.
 *
 * @module interfaces/documents/base
 */

import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IHasId } from '@digitaldefiance/suite-core-lib';

/**
 * Storage-agnostic base document type.
 *
 * For Mongoose backends, the concrete document type is a superset
 * (MongooseDocument & T) and is assignable to this type.
 * For BrightDb or other backends, plain objects with `_id` + T fields work.
 *
 * @template T - Domain data interface (e.g. IUserBase, IRoleBase)
 * @template TID - Platform ID type (defaults to Buffer)
 */
export type BaseDocument<T, TID extends PlatformID = Buffer> = IHasId<TID> & T;
