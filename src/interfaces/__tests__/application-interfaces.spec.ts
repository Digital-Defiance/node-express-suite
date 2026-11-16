/**
 * Type-level contract test for IApplication and the application ports.
 *
 * The test passes if the file compiles. Every port is satisfied by a plain
 * object literal (no cast, no class instance), and each port has a
 * `@ts-expect-error` case proving it still requires its members. ts-jest
 * fails the file when an expected error disappears.
 *
 * Environment: a plain object can satisfy the narrow environment views
 * (IAppRouterEnvironment and the others), which hold only strings and
 * booleans. The full IEnvironment still holds EmailString (and optional
 * SecureString) members from ecies-lib, so the tests that need it take the
 * value from a `declare const`, which is erased at compile time.
 */
import type { ITokenUser } from '@digitaldefiance/suite-core-lib';
import type { ApiResponse } from '../../types';
import { LocalhostConstants } from '../../constants';
import { ServiceContainer } from '../../container/service-container';
import { BaseController } from '../../controllers/base';
import { DecoratorBaseController } from '../../decorators/base-controller';
import { Environment } from '../../environment';
import { OpenAPIController } from '../../openapi/controller';
import type { IApplicationPlugin } from '../../plugins/plugin-interface';
import { PluginManager } from '../../plugins/plugin-manager';
import { AdminEmailRouter } from '../../routers/admin-email-router';
import { AppRouter } from '../../routers/app';
import { BaseRouter } from '../../routers/base';
import { AbstractJwtService } from '../../services/abstract-jwt-service';
import { AbstractRoleService } from '../../services/abstract-role-service';
import { BaseService } from '../../services/base';
import { DummyEmailService } from '../../services/dummy-email-service';
import { FakeEmailService } from '../../services/fake-email-service';
import { PostfixEmailService } from '../../services/postfixEmail';
import { authenticateCrypto } from '../../middlewares/authenticate-crypto';
import { authenticateToken } from '../../middlewares/authenticate-token';
import { useSessionEstablish } from '../../middlewares/session-unlock';
import { withTransaction } from '../../utils';
import type { IApplication } from '../application';
import type {
  IAppRouterApplication,
  IAppRouterEnvironment,
  IApplicationCore,
  IAuthProviderPort,
  IConstantsPort,
  IControllerApplication,
  IDatabasePort,
  IEmailSenderEnvironment,
  IEnvironmentPort,
  IJwtServiceApplication,
  IJwtServiceEnvironment,
  IServicesPort,
} from '../application-ports';
import type { IAuthenticationProvider } from '../authentication-provider';
import type { IEnvironment } from '../environment';
import type {
  IApplicationPluginHost,
  IPluginManager,
  IPluginsPort,
} from '../plugin-manager';
import type { IServiceContainer } from '../service-container';

// Values that exist only at the type level (never executed).
declare const fullEnvironment: IEnvironment;

const authProvider: IAuthenticationProvider = {
  findUserById: async () => null,
  buildRequestUserDTO: async () => null,
  verifyToken: async <T extends ITokenUser = ITokenUser>(): Promise<T | null> =>
    null,
};

const services: IServiceContainer = {
  register(): void {
    /* no-op */
  },
  get<T>(key: string): T {
    throw new Error('not registered: ' + key);
  },
  has: () => false,
};

// The smallest container shape downstream packages declare for plugins.
interface IMinimalContainer {
  register<T>(key: string, factory: () => T, overwrite?: boolean): void;
  get<T>(key: string): T;
  has(key: string): boolean;
}
declare const minimalContainer: IMinimalContainer;
export const minimalContainerIsAnIServiceContainer = (): IServiceContainer =>
  minimalContainer;

const plugins: IPluginManager = {
  register(): void {
    /* no-op */
  },
  initAll: async () => undefined,
  stopAll: async () => undefined,
  get: () => undefined,
  has: () => false,
};

// ---- Single-member ports: plain objects, no cast ---------------------------

export const constantsPort: IConstantsPort = { constants: LocalhostConstants };
export const servicesPort: IServicesPort = { services };
export const pluginsPort: IPluginsPort = { plugins };
export const databasePort: IDatabasePort = { database: undefined };
export const authProviderPort: IAuthProviderPort = { authProvider };
export const authProviderPortUnset: IAuthProviderPort = {
  authProvider: undefined,
};

// ---- Narrow environment views: strings and booleans only -------------------

export const appRouterEnvironment: IAppRouterEnvironment = {
  apiDistDir: '/dist/api',
  reactDistDir: '/dist/react',
  production: false,
  serverUrl: 'http://localhost:3000',
  basePath: '/',
  emailDomain: 'example.com',
  totpAvailable: false,
  debug: false,
};
export const jwtServiceEnvironment: IJwtServiceEnvironment = {
  jwtSecret: 'secret',
};
export const emailSenderEnvironment: IEmailSenderEnvironment = {
  emailSender: 'noreply@example.com',
  disableEmailSend: true,
  debug: false,
};
export const environmentPortNarrow: IEnvironmentPort<IJwtServiceEnvironment> = {
  environment: jwtServiceEnvironment,
};

// ---- Composites: plain objects, no cast ------------------------------------

export const controllerApp: IControllerApplication = {
  constants: LocalhostConstants,
  database: undefined,
  authProvider,
};
export const appRouterApp: IAppRouterApplication = {
  environment: appRouterEnvironment,
  constants: LocalhostConstants,
};
export const jwtServiceApp: IJwtServiceApplication = {
  environment: jwtServiceEnvironment,
  constants: LocalhostConstants,
  database: undefined,
};
// The full environment comes from a `declare const`, so the objects that need
// it are built inside functions that the tests never call.
export const buildCoreApp = (): IApplicationCore => ({
  environment: fullEnvironment,
  constants: LocalhostConstants,
  services,
  database: undefined,
  authProvider,
});
export const buildPluginHost = (): IApplicationPluginHost => ({
  ...buildCoreApp(),
  plugins,
  ready: true,
  start: async () => undefined,
});
export const buildHostMissingLifecycle = (): IApplicationPluginHost =>
  // @ts-expect-error IApplicationPluginHost requires ready and start
  ({ ...buildCoreApp(), plugins });

// ---- Consumers accept the ports (compile-time constraint checks) -----------

export type RouterOnPlainObject = BaseRouter<Buffer, { anything: true }>;
export type AppRouterOnPort = AppRouter<Buffer, IAppRouterApplication>;
export type AdminEmailRouterOnPlainObject = AdminEmailRouter<
  Buffer,
  { anything: true }
>;
export type ControllerOnPort = BaseController<
  ApiResponse,
  object,
  string,
  Buffer,
  IControllerApplication
>;
export type DecoratorControllerOnPort = DecoratorBaseController<
  'en-US',
  Buffer,
  IControllerApplication
>;
export type ServiceOnPort = BaseService<Buffer, IDatabasePort>;
export type JwtServiceOnPort = AbstractJwtService<
  Buffer,
  ITokenUser,
  IJwtServiceApplication
>;
export type RoleServiceOnPort = AbstractRoleService<
  Buffer,
  Date,
  never,
  never,
  IDatabasePort
>;
export type FakeEmailOnPlainObject = FakeEmailService<
  Buffer,
  { anything: true }
>;
export type DummyEmailOnPlainObject = DummyEmailService<
  Buffer,
  { anything: true }
>;
export type OpenApiOnPlainObject = OpenAPIController<
  Buffer,
  { anything: true }
>;

// Parameters of functions and constructors take the ports.
export const authenticateTokenParam: Parameters<
  typeof authenticateToken<Buffer>
>[0] = authProviderPort;
export const authenticateCryptoParam: Parameters<
  typeof authenticateCrypto<Buffer>
>[0] = authProviderPort;
export const sessionEstablishParam: Parameters<
  typeof useSessionEstablish<Buffer>
>[0] = authProviderPort;
export const postfixParam: ConstructorParameters<
  typeof PostfixEmailService
>[0] = { environment: emailSenderEnvironment };
export const transactionApplication: NonNullable<
  Parameters<typeof withTransaction>[4]
>['application'] = constantsPort;

// A plugin written against IApplicationPlugin receives the host.
export const plugin: IApplicationPlugin = {
  name: 'type-test',
  init: async (app: IApplicationPluginHost) => {
    app.services.has('x');
    app.plugins.has('x');
  },
};

// ---- Backward compatibility: full applications and classes still fit -------

declare const realApplication: IApplication;
export const applicationIsEveryPort = (): void => {
  const constants: IConstantsPort = realApplication;
  const servicesFromApp: IServicesPort = realApplication;
  const pluginsFromApp: IPluginsPort = realApplication;
  const database: IDatabasePort = realApplication;
  const auth: IAuthProviderPort = realApplication;
  const environment: IEnvironmentPort = realApplication;
  const controller: IControllerApplication = realApplication;
  const router: IAppRouterApplication = realApplication;
  const jwt: IJwtServiceApplication = realApplication;
  const core: IApplicationCore = realApplication;
  const host: IApplicationPluginHost = realApplication;
  void [
    constants,
    servicesFromApp,
    pluginsFromApp,
    database,
    auth,
    environment,
    controller,
    router,
    jwt,
    core,
    host,
  ];
};
const realServices: IApplication['services'] = new ServiceContainer();
const realPlugins: IApplication['plugins'] = new PluginManager();
const realPluginAsInterface: IPluginManager = new PluginManager();
// Environment needs process environment variables to construct, so only its
// type is checked here, through a function that is never called.
export const environmentClassIsAnIEnvironment = (
  env: Environment,
): IApplication['environment'] => env;

// ---- Each port still requires its members ----------------------------------

// @ts-expect-error IConstantsPort requires constants
export const noConstants: IConstantsPort = {};
// @ts-expect-error IServicesPort requires services
export const noServices: IServicesPort = {};
// @ts-expect-error IPluginsPort requires plugins
export const noPlugins: IPluginsPort = {};
// @ts-expect-error IDatabasePort requires database (it may be undefined, not absent)
export const noDatabase: IDatabasePort = {};
// @ts-expect-error IAuthProviderPort requires authProvider (it may be undefined, not absent)
export const noAuthProvider: IAuthProviderPort = {};
// @ts-expect-error IEnvironmentPort requires environment
export const noEnvironment: IEnvironmentPort<IJwtServiceEnvironment> = {};
export const jwtEnvironmentMissingSecret: IEnvironmentPort<IJwtServiceEnvironment> =
  {
    // @ts-expect-error the narrow view still requires jwtSecret
    environment: {},
  };
// @ts-expect-error the narrow view still requires every member it names
export const appRouterEnvironmentMissingMember: IAppRouterEnvironment = {
  apiDistDir: '/dist/api',
};
// @ts-expect-error the narrow view still requires every member it names
export const emailEnvironmentMissingMember: IEmailSenderEnvironment = {
  emailSender: 'noreply@example.com',
};
// @ts-expect-error IControllerApplication requires authProvider
export const controllerMissingAuth: IControllerApplication = {
  constants: LocalhostConstants,
  database: undefined,
};
// @ts-expect-error IAppRouterApplication requires constants
export const appRouterMissingConstants: IAppRouterApplication = {
  environment: appRouterEnvironment,
};
// @ts-expect-error IJwtServiceApplication requires database
export const jwtMissingDatabase: IJwtServiceApplication = {
  environment: jwtServiceEnvironment,
  constants: LocalhostConstants,
};
export const buildCoreMissingServices = (): IApplicationCore =>
  // @ts-expect-error IApplicationCore requires services
  ({
    environment: fullEnvironment,
    constants: LocalhostConstants,
    database: undefined,
    authProvider,
  });
export const buildHostMissingPlugins = (): IApplicationPluginHost =>
  // @ts-expect-error IApplicationPluginHost requires plugins
  ({ ...buildCoreApp() });
// @ts-expect-error a Pick of IApplication still requires every picked member
export const missingMember: Pick<IApplication, 'services' | 'authProvider'> = {
  services,
};
type NoPorts = { anything: true };
type AuthParam = Parameters<typeof authenticateToken<Buffer>>[0];
// @ts-expect-error the constraint of AppRouter still requires its ports
export type AppRouterOnEmptyObject = AppRouter<Buffer, NoPorts>;
export type ControllerOnEmptyObject = BaseController<
  ApiResponse,
  object,
  string,
  Buffer,
  // @ts-expect-error the constraint of BaseController still requires its ports
  NoPorts
>;
// @ts-expect-error the constraint of BaseService still requires its port
export type ServiceOnEmptyObject = BaseService<Buffer, NoPorts>;
export const authenticateTokenNoMember: AuthParam = {
  // @ts-expect-error authenticateToken still requires an authProvider member
  constants: LocalhostConstants,
};

describe('application ports', () => {
  it('accepts plain object literals for every port', () => {
    expect(constantsPort.constants).toBe(LocalhostConstants);
    expect(servicesPort.services.has('anything')).toBe(false);
    expect(pluginsPort.plugins.has('anything')).toBe(false);
    expect(databasePort.database).toBeUndefined();
    expect(authProviderPort.authProvider).toBe(authProvider);
    expect(appRouterApp.environment.apiDistDir).toBe('/dist/api');
    expect(jwtServiceApp.environment.jwtSecret).toBe('secret');
    expect(controllerApp.authProvider).toBe(authProvider);
    expect(buildPluginHost).toBeInstanceOf(Function);
    expect(postfixParam.environment.emailSender).toBe('noreply@example.com');
    expect(transactionApplication).toBe(constantsPort);
  });

  it('keeps the runtime classes assignable to the interfaces', () => {
    expect(realServices).toBeInstanceOf(ServiceContainer);
    expect(realPlugins).toBeInstanceOf(PluginManager);
    expect(realPluginAsInterface.has('x')).toBe(false);
    expect(environmentClassIsAnIEnvironment).toBeInstanceOf(Function);
    expect(applicationIsEveryPort).toBeInstanceOf(Function);
    expect(plugin.name).toBe('type-test');
  });

  it('proves the ports still require their members', () => {
    // The compile-time checks are the @ts-expect-error lines above.
    expect(missingMember).toBeDefined();
    expect(noConstants).toBeDefined();
  });
});
