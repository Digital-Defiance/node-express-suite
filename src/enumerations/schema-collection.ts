/**
 * Enumerations for the schema collections.
 */
export enum SchemaCollection {
  /**
   * Collection for email tokens sent to users
   */
  EmailToken = 'email-tokens',
  /**
   * Collection for roles in the application
   */
  Role = 'roles',
  /**
   * Collection for user tokens
   */
  UserToken = 'user-tokens',
  /**
   * Collection for users in the application
   */
  User = 'users',
  /**
   * Collection for mnemonics used in the application
   */
  Mnemonic = 'mnemonics',
  /**
   * Collection for user-role relationships
   */
  UserRole = 'user-roles',
  /**
   * Collection for used direct login tokens
   */
  UsedDirectLoginToken = 'used-direct-login-tokens',
}
