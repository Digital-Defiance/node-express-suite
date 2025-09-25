/**
 * Partial interface for creating a new user
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
