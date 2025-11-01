import { IECIESConfig } from '@digitaldefiance/ecies-lib';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';
import {
  ITokenRole,
  ITokenUser,
  IUserBase,
} from '@digitaldefiance/suite-core-lib';
import { UserController } from '../controllers/user';
import { IApplication } from '../interfaces/application';
import { IEmailService } from '../interfaces/email-service';
import { emailServiceRegistry } from '../registry';
import { BackupCodeService } from '../services/backup-code';
import { JwtService } from '../services/jwt';
import { KeyWrappingService } from '../services/key-wrapping';
import { RoleService } from '../services/role';
import { UserService } from '../services/user';
import { BaseRouter } from './base';
import { Types } from 'mongoose';
import { IBaseDocument } from '../documents';
import { Environment } from '../environment';
import { IConstants } from '../interfaces';

/**
 * Router for the API
 */
export class ApiRouter<
  I extends Types.ObjectId | string,
  D extends Date,
  S extends string,
  A extends string,
  TUser extends IUserBase<I, D, S, A> = IUserBase<I, D, S, A>,
  TTokenRole extends ITokenRole<I, D> = ITokenRole<I, D>,
  TBaseDocument extends IBaseDocument<any, Types.ObjectId> = IBaseDocument<any, Types.ObjectId>,
  TTokenUser extends ITokenUser = ITokenUser,
  TConstants extends IConstants = IConstants,
  TEnvironment extends Environment = Environment,
  TApplication extends IApplication<any, Types.ObjectId, TBaseDocument, TEnvironment, TConstants> = IApplication<any, Types.ObjectId, TBaseDocument, TEnvironment, TConstants>,
> extends BaseRouter<TApplication> {
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
    this.jwtService = new JwtService(application);
    this.roleService = new RoleService<I, D, TTokenRole>(application);
    this.emailService = emailServiceRegistry.getService();
    this.keyWrappingService = new KeyWrappingService();
    const config: IECIESConfig = {
      curveName: application.constants.ECIES.CURVE_NAME,
      primaryKeyDerivationPath:
        application.constants.ECIES.PRIMARY_KEY_DERIVATION_PATH,
      mnemonicStrength: application.constants.ECIES.MNEMONIC_STRENGTH,
      symmetricAlgorithm:
        application.constants.ECIES.SYMMETRIC_ALGORITHM_CONFIGURATION,
      symmetricKeyBits: application.constants.ECIES.SYMMETRIC.KEY_BITS,
      symmetricKeyMode: application.constants.ECIES.SYMMETRIC.MODE,
    };
    this.eciesService = new ECIESService(config);
    this.backupCodeService = new BackupCodeService<
      I,
      D,
      TTokenRole,
      TApplication
    >(
      application,
      this.eciesService,
      this.keyWrappingService,
      this.roleService,
    );

    this.userService = new UserService<
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
      application,
      this.roleService,
      this.emailService,
      this.keyWrappingService,
      this.backupCodeService,
    );
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
}
