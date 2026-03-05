/**
 * @fileoverview Storage adapter interface for backup code operations.
 * Decouples the BackupCodeService from any specific database implementation
 * (Mongoose, BrightDB, etc.) by abstracting the user record read/write operations.
 * @module interfaces/backup-code-store
 */

import type { MemberType } from '@digitaldefiance/ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IBackupCode } from '@digitaldefiance/suite-core-lib';

/**
 * Minimal user record shape required by the BackupCodeService.
 * Storage adapters must be able to read and return this shape.
 *
 * This is intentionally a plain data interface — no `.save()` or
 * document methods. Persistence is handled by the store itself.
 */
export interface IBackupCodeUserRecord<TID extends PlatformID = Buffer> {
  /** User's unique identifier */
  _id: TID;
  /** Username */
  username: string;
  /** Email address */
  email: string;
  /** Hex-encoded ECIES public key */
  publicKey: string;
  /** Encrypted backup codes */
  backupCodes: Array<IBackupCode>;
  /** Password-wrapped private key (optional, for password-based accounts) */
  passwordWrappedPrivateKey?: {
    salt: string;
    iv: string;
    authTag: string;
    ciphertext: string;
    iterations: number;
  };
  /** Record creation timestamp */
  createdAt: Date | string;
  /** Record update timestamp */
  updatedAt: Date | string;
}

/**
 * Mutable fields that the BackupCodeService may update on a user record
 * during recovery or code regeneration.
 */
export interface IBackupCodeUserUpdate {
  /** Updated backup codes array (after consumption or regeneration) */
  backupCodes?: Array<IBackupCode>;
  /** Updated password-wrapped private key (after password reset via recovery) */
  passwordWrappedPrivateKey?: {
    salt: string;
    iv: string;
    authTag: string;
    ciphertext: string;
    iterations: number;
  };
}

/**
 * Storage-agnostic adapter for backup code persistence.
 *
 * Implementations handle the specifics of reading/writing user records
 * in their respective storage backends (Mongoose, BrightDB, etc.).
 *
 * @template TID - Platform ID type (Buffer, ObjectId, etc.)
 */
export interface IBackupCodeStore<TID extends PlatformID = Buffer> {
  /**
   * Retrieve the user record needed for backup code operations.
   * @param userId - The user's unique identifier
   * @returns The user record, or null if not found
   */
  getUserRecord(userId: TID): Promise<IBackupCodeUserRecord<TID> | null>;

  /**
   * Persist updated backup code data for a user.
   * Called after code consumption (recovery) or regeneration.
   * The implementation should handle its own transaction semantics.
   *
   * @param userId - The user's unique identifier
   * @param updates - The fields to update
   */
  updateUserRecord(userId: TID, updates: IBackupCodeUserUpdate): Promise<void>;

  /**
   * Resolve the MemberType for a user (e.g. System, Admin, User).
   * Used during key recovery to reconstruct the BackendMember.
   *
   * @param userId - The user's unique identifier
   * @returns The member type
   */
  getMemberType(userId: TID): Promise<MemberType>;

  /**
   * Fetch a batch of user records for bulk operations (e.g. key rotation).
   * Returns records ordered by _id, starting after `afterId`.
   *
   * @param afterId - Cursor: return records with _id > afterId. Omit for first batch.
   * @param limit - Maximum number of records to return
   * @returns Array of user records
   */
  fetchBatch(
    afterId?: string,
    limit?: number,
  ): Promise<Array<IBackupCodeUserRecord<TID>>>;
}
