import {
  EmailString,
  MemberType,
  SecureBuffer,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { Types } from '@digitaldefiance/mongoose-types';
import {
  Member as BackendMember,
  ECIESService,
} from '@digitaldefiance/node-ecies-lib';
import {
  SuiteCoreStringKey,
  TranslatableSuiteError,
} from '@digitaldefiance/suite-core-lib';
import { Environment } from '../environment';
import { IConstants } from '../interfaces/constants';

/**
 * Service to manage the system member's wallet.
 */
export class SystemUserService {
  private static systemUser: BackendMember<Buffer> | null = null;

  /**
   * Initializes and returns the system member's Member instance.
   * The mnemonic should be stored securely in environment variables.
   */
  public static getSystemUser(
    environment: Environment,
    constants: IConstants,
  ): BackendMember<Buffer> {
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
      const eciesService = new ECIESService(undefined, constants.ECIES);
      const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);
      const keyPair = eciesService.walletToSimpleKeyPairBuffer(wallet);

      SystemUserService.systemUser = new BackendMember(
        eciesService,
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

  public static setSystemUser<
    TID extends string | Types.ObjectId | Buffer = Buffer,
  >(user: BackendMember<TID>, constants: IConstants): void {
    if (user.type !== MemberType.System || user.name !== constants.SystemUser) {
      throw new Error(
        'setSystemUser can only be called with a MemberType.System user',
      );
    }
    SystemUserService.systemUser = user as BackendMember<Buffer>;
  }
}
