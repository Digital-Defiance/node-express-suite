import { IECIESConfig } from '@digitaldefiance/ecies-lib';
import { ECIESService, PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ITokenRole,
  ITokenUser,
  IUserBase,
} from '@digitaldefiance/suite-core-lib';
import { ServiceKeys } from '../container';
import { UserController } from '../controllers/user';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';
import { IApplication } from '../interfaces/application';
import { IEmailService } from '../interfaces/email-service';
import { emailServiceRegistry } from '../registry';
import { BackupCodeService } from '../services/backup-code';
import { JwtService } from '../services/jwt';
import { KeyWrappingService } from '../services/key-wrapping';
import { RoleService } from '../services/role';
import { UserService } from '../services/user';
import { BaseRouter } from './base';

/**
 * Router for the API
 */
export class ApiRouter<
  I extends PlatformID,
  D extends Date,
  S extends string,
  A extends string,
  TUser extends IUserBase<I, D, S, A> = IUserBase<I, D, S, A>,
  TTokenRole extends ITokenRole<I, D> = ITokenRole<I, D>,
  TBaseDocument extends IBaseDocument<any, I> = IBaseDocument<any, I>,
  TTokenUser extends ITokenUser = ITokenUser,
  TConstants extends IConstants = IConstants,
  TEnvironment extends Environment<I> = Environment<I>,
  TApplication extends IApplication<I> = IApplication<I>,
> extends BaseRouter<I, TApplication> {
  private readonly userController: UserController<
    I,
    D,
    S,
    A,
    TUser,
    TTokenRole,
    TTokenUser,
    TApplication
  >;
  private readonly jwtService: JwtService<
    I,
    D,
    TTokenRole,
    TTokenUser,
    TApplication
  >;
  private readonly emailService: IEmailService;
  private readonly userService: UserService<
    any,
    I,
    D,
    S,
    A,
    TEnvironment,
    TConstants,
    TBaseDocument,
    TUser,
    TTokenRole,
    TApplication
  >;
  private readonly roleService: RoleService<I, D, TTokenRole>;
  private readonly keyWrappingService: KeyWrappingService;
  private readonly eciesService: ECIESService;
  private readonly backupCodeService: BackupCodeService<
    I,
    D,
    TTokenRole,
    TApplication
  >;
  /**
   * Constructor for the API router
   * @param connection The mongoose connection
   * @param getModel The function to get a mongoose model by name
   */
  constructor(application: TApplication) {
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
      I,
      D,
      S,
      A,
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
    this.router.use('/user', this.userController.router);
  }

  private registerServices(): void {
    const app = this.application;

    if (!app.services.has(ServiceKeys.JWT)) {
      app.services.register(
        ServiceKeys.JWT,
        () => new JwtService<I, D, TTokenRole, TTokenUser, TApplication>(app),
      );
    }
    if (!app.services.has(ServiceKeys.ROLE)) {
      app.services.register(
        ServiceKeys.ROLE,
        () => new RoleService<I, D, TTokenRole>(app),
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
          new BackupCodeService<I, D, TTokenRole, TApplication>(
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
            I,
            D,
            S,
            A,
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
