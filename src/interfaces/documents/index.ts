/**
 * @fileoverview Storage-agnostic document type aliases.
 *
 * These types represent the shape of documents as stored in any backend
 * (Mongoose/MongoDB, BrightDb, etc.). They are simply the suite-core-lib
 * base interfaces with backend-appropriate type parameters (TDate = Date,
 * enums pinned to concrete types).
 *
 * Mongo documents (MongooseDocument & IFooBase) are a superset of these
 * types, so they satisfy the contract. BrightDb plain-object records also
 * satisfy the contract since they carry the same fields.
 *
 * Downstream packages should use these types when they need to reference
 * "a user record" or "a role record" without caring about the storage engine.
 *
 * @module interfaces/documents
 */

export type { UserDocument } from './user';
export type { RoleDocument } from './role';
export type { EmailTokenDocument } from './email-token';
export type { UserRoleDocument } from './user-role';
export type { MnemonicDocument } from './mnemonic';
export type { UsedDirectLoginTokenDocument } from './used-direct-login-token';
export type { BaseDocument } from './base';
