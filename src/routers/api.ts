/**
 * @fileoverview API router configuration with dependency injection and service registration.
 * Manages user controller and all required services for API endpoints.
 * @module routers/api
 */

import { IECIESConfig } from '@digitaldefiance/ecies-lib';
import { ECIESService, PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ITokenRole,
  ITokenUser,
  IUserBase,
} from '@digitaldefiance/suite-core-lib';
import { ServiceKeys } from '../container';
import { UserController } from '../controllers/user';
import { BaseDocument } from '../documents';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import { IMongoApplication } from '../interfaces/mongo-application';
import { IEmailService } from '../interfaces/email-service';
import { emailServiceRegistry } from '../registry';
import { BackupCodeService } from '../services/backup-code';
import { JwtService } from '../services/jwt';
import { KeyWrappingService } from '../services/key-wrapping';
import { RoleService } from '../services/role';
import { UserService } from '../services/user';
import { BaseRouter } from './base';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { OpenApiController } from '../controllers/openapi';

/**
 * Router for the API endpoints.
 * Manages user controller and registers all required services via dependency injection.
 * @template TID Platform-specific ID type
 * @template TDate Date type
 * @template TLanguage Site language string literal type
 * @template TAccountStatus Account status string literal type
 * @template TUser User base type
 * @template TTokenRole Token role type
 * @template TBaseDocument Base document type
 * @template TTokenUser Token user type
 * @template TConstants Constants type
 * @template TEnvironment Environment type
 * @template TApplication Application type
 */
export class ApiRouter<
  TID extends PlatformID,
  TDate extends Date,
  TLanguage extends CoreLanguageCode,
  TAccountStatus extends string,
  TUser extends IUserBase<TID, TDate, TLanguage, TAccountStatus> = IUserBase<
    TID,
    TDate,
    TLanguage,
    TAccountStatus
  >,
  TTokenRole extends ITokenRole<TID, TDate> = ITokenRole<TID, TDate>,
  TBaseDocument extends BaseDocument<any, TID> = BaseDocument<any, TID>,
  TTokenUser extends ITokenUser = ITokenUser,
  TConstants extends IConstants = IConstants,
  TEnvironment extends Environment<TID> = Environment<TID>,
  TApplication extends IMongoApplication<TID> = IMongoApplication<TID>,
> extends BaseRouter<TID, TApplication> {
  private readonly openApiController: OpenApiController<TID>;
  /** User controller for handling user-related API endpoints */
  private readonly userController: UserController<
    TID,
    TDate,
    TLanguage,
    TAccountStatus,
    TUser,
    TTokenRole,
    TTokenUser,
    TApplication
  >;
  /** JWT service for token generation and validation */
  private readonly jwtService: JwtService<
    TID,
    TDate,
    TTokenRole,
    TTokenUser,
    TApplication
  >;
  /** Email service for sending emails */
  private readonly emailService: IEmailService;
  /** User service for user management operations */
  private readonly userService: UserService<
    any,
    TID,
    TDate,
    TLanguage,
    TAccountStatus,
    TEnvironment,
    TConstants,
    TBaseDocument,
    TUser,
    TTokenRole,
    TApplication
  >;
  /** Role service for role management operations */
  private readonly roleService: RoleService<TID, TDate, TTokenRole>;
  /** Key wrapping service for password-based encryption */
  private readonly keyWrappingService: KeyWrappingService;
  /** ECIES service for elliptic curve encryption */
  private readonly eciesService: ECIESService<TID>;
  /** Backup code service for generating and validating backup codes */
  private readonly backupCodeService: BackupCodeService<
    TID,
    TDate,
    TTokenRole,
    TApplication
  >;
  /**
   * Creates a new API router instance.
   * Registers all required services and initializes the user controller.
   * @param application Application instance with database connection and configuration
   */
  constructor(
    application: TApplication,
    docsRoute: string | undefined = '/openapi',
  ) {
    super(application);
    this.registerServices();
    this.jwtService = application.services.get(ServiceKeys.JWT);
    this.roleService = application.services.get(ServiceKeys.ROLE);
    this.emailService = application.services.get(ServiceKeys.EMAIL);
    this.keyWrappingService = application.services.get(
      ServiceKeys.KEY_WRAPPING,
    );
    this.eciesService = application.services.get(ServiceKeys.ECIES);
    this.backupCodeService = application.services.get(ServiceKeys.BACKUP_CODE);
    this.userService = application.services.get(ServiceKeys.USER);
    this.userController = new UserController<
      TID,
      TDate,
      TLanguage,
      TAccountStatus,
      TUser,
      TTokenRole,
      TTokenUser,
      TApplication
    >(
      application,
      this.jwtService,
      this.userService,
      this.backupCodeService,
      this.roleService,
      this.eciesService,
    );
    this.openApiController = new OpenApiController(application);
    this.router.use('/user', this.userController.router);
    if (docsRoute !== undefined && docsRoute !== '') {
      this.router.use(docsRoute, this.openApiController.router);
    }
  }

  /**
   * Registers all required services in the application service container.
   * Services are registered as singletons and lazily instantiated.
   * @private
   */
  private registerServices(): void {
    const app = this.application;

    if (!app.services.has(ServiceKeys.JWT)) {
      app.services.register(
        ServiceKeys.JWT,
        () =>
          new JwtService<TID, TDate, TTokenRole, TTokenUser, TApplication>(app),
      );
    }
    if (!app.services.has(ServiceKeys.ROLE)) {
      app.services.register(
        ServiceKeys.ROLE,
        () => new RoleService<TID, TDate, TTokenRole>(app),
      );
    }
    if (!app.services.has(ServiceKeys.EMAIL)) {
      app.services.register(ServiceKeys.EMAIL, () =>
        emailServiceRegistry.getService(),
      );
    }
    if (!app.services.has(ServiceKeys.KEY_WRAPPING)) {
      app.services.register(
        ServiceKeys.KEY_WRAPPING,
        () => new KeyWrappingService(),
      );
    }
    if (!app.services.has(ServiceKeys.ECIES)) {
      app.services.register(ServiceKeys.ECIES, () => {
        const config: IECIESConfig = {
          curveName: app.constants.ECIES.CURVE_NAME,
          primaryKeyDerivationPath:
            app.constants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
          mnemonicStrength: app.constants.ECIES.MNEMONIC_STRENGTH,
          symmetricAlgorithm:
            app.constants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
          symmetricKeyBits: app.constants.ECIES.SYMMETRIC.KEY_BITS,
          symmetricKeyMode: app.constants.ECIES.SYMMETRIC.MODE,
        };
        return new ECIESService(config);
      });
    }
    if (!app.services.has(ServiceKeys.BACKUP_CODE)) {
      app.services.register(
        ServiceKeys.BACKUP_CODE,
        () =>
          new BackupCodeService<TID, TDate, TTokenRole, TApplication>(
            app,
            app.services.get(ServiceKeys.ECIES),
            app.services.get(ServiceKeys.KEY_WRAPPING),
            app.services.get(ServiceKeys.ROLE),
          ),
      );
    }
    if (!app.services.has(ServiceKeys.USER)) {
      app.services.register(
        ServiceKeys.USER,
        () =>
          new UserService<
            any,
            TID,
            TDate,
            TLanguage,
            TAccountStatus,
            TEnvironment,
            TConstants,
            TBaseDocument,
            TUser,
            TTokenRole,
            TApplication
          >(
            app,
            app.services.get(ServiceKeys.ROLE),
            app.services.get(ServiceKeys.EMAIL),
            app.services.get(ServiceKeys.KEY_WRAPPING),
            app.services.get(ServiceKeys.BACKUP_CODE),
          ),
      );
    }
  }
}
