/**
 * @fileoverview Storage-agnostic authentication provider interface.
 * Abstracts user lookup, role fetching, and credential verification
 * so that authentication middlewares work with any storage backend
 * (Mongoose, BrightChainDb, etc.).
 * @module interfaces/authentication-provider
 */

import type { SecureString } from '@digitaldefiance/ecies-lib';
import type { Member as BackendMember } from '@digitaldefiance/node-ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type {
  IRequestUserDTO,
  ITokenUser,
} from '@digitaldefiance/suite-core-lib';

/**
 * Minimal user record returned by the authentication provider.
 * Contains only the fields needed by the authentication middlewares.
 */
export interface IAuthenticatedUser<
  TLanguage extends string = string,
  TID extends PlatformID = Buffer,
> {
  /** Stringified user ID */
  id: string;
  /** Account status (e.g. 'Active', 'Suspended') */
  accountStatus: string;
  /** User's email address */
  email: string;
  /** User's site language preference */
  siteLanguage?: TLanguage;
  /** User's timezone */
  timezone: string;
  /** Last login timestamp (ISO string or undefined) */
  lastLogin?: string;
  /**
   * The full backend Member object with crypto capabilities.
   * Populated by providers that load the Member during findUserById
   * (e.g. BrightChain's MemberStore-backed provider).
   * The middleware attaches this to req.member when present.
   */
  member?: BackendMember<TID>;
}

/**
 * Result of a crypto-authentication (mnemonic or password login).
 */
export interface ICryptoAuthResult<TID extends PlatformID = Buffer> {
  /** The authenticated user's ID as a string */
  userId: string;
  /** The authenticated BackendMember with private key loaded */
  userMember: BackendMember<TID>;
}

/**
 * Storage-agnostic authentication provider.
 *
 * Implementations supply user lookup, role resolution, and credential
 * verification. The express-suite authentication middlewares delegate to
 * this interface instead of calling Mongoose directly.
 *
 * @template TID Platform-specific ID type (Buffer, ObjectId, etc.)
 * @template TLanguage Site language string literal type
 */
export interface IAuthenticationProvider<
  TID extends PlatformID = Buffer,
  TLanguage extends string = string,
> {
  /**
   * Look up a user by their ID and return a minimal user record.
   * Returns null if the user does not exist.
   */
  findUserById(
    userId: string,
  ): Promise<IAuthenticatedUser<TLanguage, TID> | null>;

  /**
   * Build an IRequestUserDTO for the given user.
   * Includes role resolution and privilege calculation.
   */
  buildRequestUserDTO(userId: string): Promise<IRequestUserDTO | null>;

  /**
   * Verify a JWT token and return the decoded token user.
   * Returns null if the token is invalid.
   */
  verifyToken<TTokenUser extends ITokenUser = ITokenUser>(
    token: string,
  ): Promise<TTokenUser | null>;

  /**
   * Authenticate with a mnemonic and return the crypto result.
   * Throws on invalid credentials.
   */
  authenticateWithMnemonic?(
    email: string,
    mnemonic: SecureString,
  ): Promise<ICryptoAuthResult<TID>>;

  /**
   * Authenticate with a password and return the crypto result.
   * Throws on invalid credentials.
   */
  authenticateWithPassword?(
    email: string,
    password: string,
  ): Promise<ICryptoAuthResult<TID>>;
}
