/**
 * @fileoverview Application ports: small structural interfaces describing the
 * parts of {@link IApplication} that routers, controllers, middlewares,
 * services and plugins actually read.
 *
 * Code that only reads `application.constants` should accept an
 * {@link IConstantsPort}, not the whole application. A consumer can then pass a
 * plain object literal with no cast. `IApplication` stays the full contract
 * that real applications implement and extends every port, so a real
 * application is assignable to any port or composite below.
 *
 * Ports are single-member and composable with `&`. The composites at the end
 * of the file are the named shapes used by this package.
 * @module interfaces/application-ports
 */
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IDatabase } from '@digitaldefiance/suite-core-lib';
import type { IAuthenticationProvider } from './authentication-provider';
import type { IConstants } from './constants';
import type { IEnvironment } from './environment';
import type { IServiceContainer } from './service-container';

/**
 * Port exposing the application environment.
 * @template TEnvironment - The environment shape the consumer reads. Defaults
 * to the full {@link IEnvironment}. Use one of the narrow environment views
 * below (or a `Pick<IEnvironment, ...>`) so a consumer is not forced to build
 * secret-holding members such as `SecureString` values.
 */
export interface IEnvironmentPort<TEnvironment = IEnvironment> {
  /** Application environment configuration */
  readonly environment: TEnvironment;
}

/** Port exposing the application constants. */
export interface IConstantsPort {
  /** Application constants and configuration values */
  readonly constants: IConstants;
}

/** Port exposing the service container. */
export interface IServicesPort {
  /** Service container for dependency injection */
  readonly services: IServiceContainer;
}

/** Port exposing the optional storage-agnostic database. */
export interface IDatabasePort {
  /** Storage-agnostic database instance, if the application has one */
  readonly database: IDatabase | undefined;
}

/**
 * Port exposing the optional authentication provider.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export interface IAuthProviderPort<TID extends PlatformID = Buffer> {
  /** Storage-agnostic authentication provider, if the application has one */
  readonly authProvider: IAuthenticationProvider<TID> | undefined;
}

/**
 * Environment members read by {@link AppRouter}. All are plain strings and
 * booleans, so no secret-holding value is needed.
 */
export type IAppRouterEnvironment = Pick<
  IEnvironment,
  | 'apiDistDir'
  | 'reactDistDir'
  | 'production'
  | 'serverUrl'
  | 'basePath'
  | 'emailDomain'
  | 'totpAvailable'
  | 'debug'
>;

/** Environment members read by the abstract JWT service (`jwtSecret` is a plain string). */
export type IJwtServiceEnvironment = Pick<IEnvironment, 'jwtSecret'>;

/** Environment members read by {@link PostfixEmailService}. */
export type IEmailSenderEnvironment = Pick<
  IEnvironment,
  'emailSender' | 'disableEmailSend' | 'debug'
>;

/**
 * What {@link BaseController}, {@link DecoratorBaseController} and
 * {@link OpenApiController} read: constants, the database for transactions,
 * and the authentication provider for the authentication middlewares.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export type IControllerApplication<TID extends PlatformID = Buffer> =
  IConstantsPort & IDatabasePort & IAuthProviderPort<TID>;

/** What {@link AppRouter} reads: a narrow environment view and the constants. */
export type IAppRouterApplication = IEnvironmentPort<IAppRouterEnvironment> &
  IConstantsPort;

/** What the abstract JWT service reads: `jwtSecret`, constants and the database. */
export type IJwtServiceApplication = IEnvironmentPort<IJwtServiceEnvironment> &
  IConstantsPort &
  IDatabasePort;

/**
 * Everything on {@link IApplication} except plugins and lifecycle
 * (`ready`, `start`). This is what a database initializer receives.
 * @template TID - Platform ID type (defaults to Buffer)
 */
export type IApplicationCore<TID extends PlatformID = Buffer> =
  IEnvironmentPort<IEnvironment<TID>> &
    IConstantsPort &
    IServicesPort &
    IDatabasePort &
    IAuthProviderPort<TID>;
