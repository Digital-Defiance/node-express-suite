/**
 * @fileoverview User creation basics interface.
 * Defines minimal required fields for creating a new user.
 * @module interfaces/create-user-basics
 */

/**
 * Partial interface for creating a new user.
 * Contains essential user information required during registration.
 */
export interface ICreateUserBasics {
  /**
   * The username of the user
   */
  username: string;
  /**
   * The email address of the user
   */
  email: string;
  /**
   * The timezone of the user
   */
  timezone?: string;
}
