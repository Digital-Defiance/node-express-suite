import {
  ITokenRole,
  ITokenRoleDTO,
  ITokenUser,
} from '@digitaldefiance/suite-core-lib';
import {
  JsonWebTokenError,
  JwtPayload,
  TokenExpiredError as JwtTokenExpiredError,
  sign,
  verify,
  VerifyOptions,
} from 'jsonwebtoken';
import { promisify } from 'util';
import { IUserDocument } from '../documents/user';
import { InvalidJwtTokenError } from '../errors/invalid-jwt-token';
import { TokenExpiredError } from '../errors/token-expired';
import { IApplication } from '../interfaces/application';
import { IJwtSignResponse } from '../interfaces/jwt-sign-response';
import { BaseService } from './base';
import { RoleService } from './role';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';

const verifyAsync = promisify<
  string,
  string | Buffer,
  VerifyOptions,
  JwtPayload | string
>(verify);

export class JwtService<
  I extends PlatformID = Buffer,
  D extends Date = Date,
  TTokenRole extends ITokenRole<I, D> = ITokenRole<I, D>,
  TTokenUser extends ITokenUser = ITokenUser,
  TApplication extends IApplication<I> = IApplication<I>,
> extends BaseService<I, TApplication> {
  private readonly roleService: RoleService<I, D, TTokenRole>;

  /**
   * Constructor for the JWT service
   * @param application The application object
   */
  constructor(application: TApplication) {
    super(application);
    this.roleService = new RoleService<I, D, TTokenRole>(application);
  }

  /**
   * Sign a JWT token for a user
   * @param userDoc The user document to sign the token for
   * @param jwtSecret The secret to sign the token with
   * @param overrideLanguage Optional language to use for role translations
   * @returns The signed token
   */
  public async signToken(
    userDoc: IUserDocument<string, I>,
    jwtSecret: string,
    overrideLanguage?: string,
  ): Promise<IJwtSignResponse<I, D, TTokenRole>> {
    // look for roles the user is a member of (the role contains the user id in the user's roles array)
    const roles = await this.roleService.getUserRoles(userDoc._id);
    const tokenRoles: Array<TTokenRole> = this.roleService.rolesToTokenRoles(
      roles,
      overrideLanguage,
    );
    const tokenRoleDTOs = tokenRoles.map((role) =>
      RoleService.roleToRoleDTO<I, D>(role),
    );
    const roleTranslatedNames = tokenRoles.map((role) => role.translatedName);
    const roleNames = tokenRoles.map((role) => role.name);
    const tokenUser = {
      userId: userDoc._id.toString(),
      roles: tokenRoleDTOs,
    } as TTokenUser;
    // amazonq-ignore-next-line false positive
    const token = sign(tokenUser, jwtSecret, {
      algorithm: this.application.constants.JWT.ALGORITHM,
      allowInsecureKeySizes: false,
      expiresIn: this.application.constants.JWT.EXPIRATION_SEC,
    });
    return {
      token,
      tokenUser,
      roleNames,
      roleTranslatedNames,
      roles: tokenRoles,
      roleDTOs: tokenRoleDTOs,
    };
  }

  /**
   * Verify a JWT token and return the user data
   * @param token The token to verify
   * @returns The user data
   * @throws InvalidTokenError
   */
  public async verifyToken(token: string): Promise<TTokenUser | null> {
    try {
      const decoded = (await verifyAsync(
        token,
        this.application.environment.jwtSecret,
        {
          algorithms: [this.application.constants.JWT.ALGORITHM],
        },
      )) as JwtPayload;

      if (
        typeof decoded === 'object' &&
        decoded !== null &&
        'userId' in decoded &&
        'roles' in decoded
      ) {
        return {
          userId: decoded['userId'] as string,
          roles: decoded['roles'] as ITokenRoleDTO[],
        } as TTokenUser;
      } else {
        return null;
      }
    } catch (err) {
      if (err instanceof JwtTokenExpiredError) {
        throw new TokenExpiredError();
      } else if (err instanceof JsonWebTokenError) {
        throw err;
      }
      throw new InvalidJwtTokenError();
    }
  }
}
