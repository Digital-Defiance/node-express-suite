import {
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import {
  Member as BackendMember,
  ECIESService,
} from '@digitaldefiance/node-ecies-lib';
import {
  Constants,
  IConstants,
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { Environment } from '../environment';

/**
 * Service to manage the system member's wallet.
 */
export class SystemUserService {
  private static systemUser: BackendMember | null = null;
  private static eciesService: ECIESService = new ECIESService();

  /**
   * Initializes and returns the system member's Member instance.
   * The mnemonic should be stored securely in environment variables.
   */
  public static getSystemUser(
    environment: Environment,
    constants: IConstants = Constants,
  ): BackendMember {
    if (!SystemUserService.systemUser) {
      if (!environment.systemMnemonic) {
        throw new TranslatableSuiteError(
          SuiteCoreStringKey.Admin_EnvNotSetTemplate,
          {
            NAME: 'SYSTEM_MNEMONIC',
          },
        );
      }
      const mnemonic: SecureString = environment.systemMnemonic;
      const { wallet } =
        SystemUserService.eciesService.walletAndSeedFromMnemonic(mnemonic);
      const keyPair =
        SystemUserService.eciesService.walletToSimpleKeyPairBuffer(wallet);

      SystemUserService.systemUser = new BackendMember(
        SystemUserService.eciesService,
        MemberType.System,
        constants.SystemUser,
        new EmailString(constants.SystemEmail),
        keyPair.publicKey,
        new SecureBuffer(keyPair.privateKey),
        wallet,
      );
      if (
        SystemUserService.systemUser.publicKey.toString('hex') !==
        environment.systemPublicKeyHex
      ) {
        console.warn('System public key does not match environment variable', {
          derived: SystemUserService.systemUser.publicKey.toString('hex'),
          expected: environment.systemPublicKeyHex,
        });
      }
    }
    return SystemUserService.systemUser;
  }

  public static setSystemUser(
    user: BackendMember,
    constants: IConstants = Constants,
  ): void {
    if (user.type !== MemberType.System || user.name !== constants.SystemUser) {
      throw new Error(
        'setSystemUser can only be called with a MemberType.System user',
      );
    }
    SystemUserService.systemUser = user;
  }
}
