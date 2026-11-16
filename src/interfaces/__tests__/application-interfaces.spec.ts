/**
 * Type-level contract test for IApplication.
 *
 * The test passes if the file compiles. Each block builds a plain object
 * literal (no cast, no class instance) and assigns it to Pick<IApplication, ...>
 * or to a member type of IApplication. It also checks that the existing
 * runtime classes still satisfy the interfaces.
 */
import type { ITokenUser } from '@digitaldefiance/suite-core-lib';
import { ServiceContainer } from '../../container/service-container';
import { Environment } from '../../environment';
import { PluginManager } from '../../plugins/plugin-manager';
import type { IApplicationPlugin } from '../../plugins/plugin-interface';
import type { IApplication } from '../application';
import type { IAuthenticationProvider } from '../authentication-provider';
import type { IEnvironment } from '../environment';
import type { IPluginManager } from '../plugin-manager';
import type { IServiceContainer } from '../service-container';

/** The members a typical plugin or controller reads, minus environment (see below). */
type PluginAppMembers = Pick<
  IApplication,
  'services' | 'plugins' | 'authProvider' | 'database' | 'ready'
>;

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

const pluginApp: PluginAppMembers = {
  services,
  plugins,
  authProvider,
  database: undefined,
  ready: true,
};

/**
 * The environment member is a full IEnvironment, so a plain object has to
 * provide every member. Consumers that read a few keys narrow it with Pick on
 * the member type.
 */
type EnvironmentReadView = Pick<
  IEnvironment,
  'debug' | 'host' | 'port' | 'serverUrl'
>;
const environmentView: EnvironmentReadView = {
  debug: false,
  host: 'localhost',
  port: 3000,
  serverUrl: 'http://localhost:3000',
};
const narrowedApp: Omit<PluginAppMembers, 'plugins'> & {
  environment: EnvironmentReadView;
} = { ...pluginApp, environment: environmentView };

// Backward compatibility: the real classes still satisfy the interfaces and
// the IApplication member types.
const realServices: IApplication['services'] = new ServiceContainer();
const realPlugins: IApplication['plugins'] = new PluginManager();
const realPluginAsInterface: IPluginManager = new PluginManager();
// Environment needs process environment variables to construct, so only its
// type is checked here, through a function that is never called.
export const environmentClassIsAnIEnvironment = (
  env: Environment,
): IApplication['environment'] => env;

// A plugin written against IApplicationPlugin receives the same interface.
const plugin: IApplicationPlugin = {
  name: 'type-test',
  init: async (app: IApplication) => {
    app.services.has('x');
    app.plugins.has('x');
  },
};

// @ts-expect-error a Pick still requires every picked member
const missingMember: Pick<IApplication, 'services' | 'authProvider'> = {
  services,
};

describe('IApplication interface contract', () => {
  it('accepts plain object literals for Pick<IApplication, ...>', () => {
    expect(pluginApp.services.has('anything')).toBe(false);
    expect(pluginApp.plugins.has('anything')).toBe(false);
    expect(pluginApp.ready).toBe(true);
    expect(narrowedApp.environment.port).toBe(3000);
  });

  it('keeps the runtime classes assignable to the interfaces', () => {
    expect(realServices).toBeInstanceOf(ServiceContainer);
    expect(realPlugins).toBeInstanceOf(PluginManager);
    expect(realPluginAsInterface.has('x')).toBe(false);
    expect(environmentClassIsAnIEnvironment).toBeInstanceOf(Function);
    expect(plugin.name).toBe('type-test');
    expect(missingMember).toBeDefined();
  });
});
