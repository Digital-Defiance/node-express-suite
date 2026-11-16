# Application contract as interfaces (v6.0.0)

Branch `feat/application-interfaces`, base `be3ac7e` (v5.1.0). Major release 6.0.0. Not published, not tagged.

Routers, controllers, middlewares, services and plugins now depend on small structural interfaces (application ports) instead of the whole `IApplication`. A consumer can pass a plain object literal with no cast. `IApplication` stays the full contract that real applications implement.

## Problem

`IApplication` referenced three classes with private members:

| `IApplication` member | Type in 5.x | Private members | Type in 6.0 |
| --- | --- | --- | --- |
| `environment` | `Environment<TID>` | `_environment`, `_envObject` | `IEnvironment<TID>` (already existed; `Environment` already `implements` it) |
| `services` | `ServiceContainer` | `services`, `instances`, `singletons` | `IServiceContainer` (new) |
| `plugins` | `PluginManager<TID>` | `plugins`, `initialized` | `IPluginManager<TID>` (new) |

A class with a private member is nominal in TypeScript: only that class or a subclass is assignable to it. Separately, every router, controller, middleware and plugin took the whole `IApplication` although each reads two or three members.

## Application ports

All ports are exported from the package root (`src/interfaces/application-ports.ts`; the plugin ports are in `src/interfaces/plugin-manager.ts`). `IApplication` extends every single-member port, so a real application is assignable to every port and composite below.

### Single-member ports

| Port | Member | Used by |
| --- | --- | --- |
| `IConstantsPort` | `constants` | `utils.ts`: `TransactionOptions.application`, `sendApiExpressValidationErrorResponse`, `getSafeErrorMessage` |
| `IDatabasePort` | `database` | `services/base.ts`, `services/abstract-role-service.ts` |
| `IAuthProviderPort<TID>` | `authProvider` | `middlewares/authenticate-token.ts`, `middlewares/authenticate-crypto.ts`, `middlewares/session-unlock.ts` |
| `IEnvironmentPort<TEnvironment>` | `environment` (shape chosen by the caller) | `services/postfixEmail.ts` |
| `IServicesPort` | `services` | part of `IApplicationCore` |
| `IPluginsPort<TID>` | `plugins` | part of `IApplicationPluginHost` |

### Narrow environment views

`Pick<IEnvironment, ...>` aliases. They hold only strings and booleans, so a consumer does not build secret-holding values.

| View | Members | Used by |
| --- | --- | --- |
| `IAppRouterEnvironment` | `apiDistDir`, `reactDistDir`, `production`, `serverUrl`, `basePath`, `emailDomain`, `totpAvailable`, `debug` | `IAppRouterApplication` |
| `IJwtServiceEnvironment` | `jwtSecret` | `IJwtServiceApplication` |
| `IEmailSenderEnvironment` | `emailSender`, `disableEmailSend`, `debug` | `PostfixEmailService` constructor |

### Composites

| Composite | Definition | Used by |
| --- | --- | --- |
| `IControllerApplication<TID>` | `IConstantsPort & IDatabasePort & IAuthProviderPort<TID>` | `controllers/base.ts` (`BaseController`), `decorators/base-controller.ts` (`DecoratorBaseController`), `controllers/openapi.ts` (`OpenApiController`) |
| `IAppRouterApplication` | `IEnvironmentPort<IAppRouterEnvironment> & IConstantsPort` | `routers/app.ts` (`AppRouter`) |
| `IJwtServiceApplication` | `IEnvironmentPort<IJwtServiceEnvironment> & IConstantsPort & IDatabasePort` | `services/abstract-jwt-service.ts` |
| `IApplicationCore<TID>` | environment, constants, services, database, authProvider (no plugins, no lifecycle) | `database/database-initializer.ts` |
| `IApplicationPluginHost<TID>` | `IApplicationCore<TID> & IPluginsPort<TID>` | `interfaces/plugin-manager.ts` (`IApplicationPlugin.init`, `IPluginManager.initAll`), `plugins/plugin-manager.ts` |

### Classes that read no member

These keep their `TApplication` type parameter, with the default unchanged (`IApplication<TID>`), and loosen the constraint to `object`, because they only store the value:

- `routers/base.ts` (`BaseRouter`), `routers/admin-email-router.ts` (`AdminEmailRouter`), `services/fake-email-service.ts` (`FakeEmailService`), `services/dummy-email-service.ts` (`DummyEmailService`).
- `openapi/controller.ts` (`OpenAPIController`) gains a second type parameter `TApplication extends object = IApplication<TID>`. Its `application` getter returns that type.
- `plugins/upnp.ts` (`UpnpPlugin.init`) takes `_app: unknown`, since it reads nothing.

### Files that keep the full `IApplication`

- `application.ts` and `base-application.ts`: real applications. `BaseApplication implements IApplication`. `Application` passes `this` to the user-supplied `apiRouterFactory(app: IApplication<TID>)` and to the email services, so a full application is correct there.
- `interfaces/controller-config.ts`: `applicationType: IApplication<TID>` names the full application type.

## Service container and plugin manager interfaces

- `src/interfaces/service-container.ts`: `IServiceContainer` (`register`, `get`, `has`, optional `clear`) and `ServiceFactory<T>`. Overloads are copied from the class, so `ServiceMap` typing is kept. `ServiceFactory` is re-exported from `container/service-container.ts`.
- `src/interfaces/plugin-manager.ts`: `IPluginManager<TID>`, `IPluginsPort<TID>`, `IApplicationPluginHost<TID>` and `IApplicationPlugin<TID>`.
- `ServiceContainer implements IServiceContainer` and `PluginManager implements IPluginManager<TID>`. Bodies unchanged.

### Decision: `IServiceContainer.clear` stays optional

`clear` is optional. A required `clear` hurts a known consumer. BrightChain's `ISubsystemContext.services` has only `register`, `get`, `has`. With `clear` required, `services: context.services` in the BrightCal shim failed with "Property 'clear' is missing". With `clear` optional it compiles without `as ServiceContainer`. Nothing in this package calls `clear` through `IApplication`. Callers use `app.services.clear?.()`. This is a breaking change (see below).

### Decision: the type-only import cycle is removed

In the draft, `interfaces/plugin-manager.ts` and `interfaces/application.ts` imported each other. `IApplicationPlugin` and `IPluginManager` refer to each other through the plugin host (a plugin receives a host whose plugin manager registers plugins), so they are declared together in `interfaces/plugin-manager.ts`. That file now imports only `application-ports.ts`. `application.ts` imports the ports and `plugin-manager.ts`. Neither imports `application.ts`. `plugins/plugin-interface.ts` re-exports `IApplicationPlugin`, so existing imports keep working.

One import cycle remains in the `interfaces` graph and is not new: `interfaces/environment.ts` imports `backup-code.ts`, which imports the `interfaces` barrel. It is type-only and untouched here.

## What the ports still need from ecies-lib

- The narrow environment views need nothing from `EmailString` or `SecureString`.
- `IApplicationCore` and `IApplicationPluginHost` carry the full `IEnvironment<TID>`. Its required members `adminEmail`, `memberEmail` and `systemEmail` are `EmailString`, and several optional members are `SecureString`/`SecureBuffer`. A plain object for these two ports therefore has to provide real `EmailString` instances (constructible without a cast) and every other required `IEnvironment` member. `SecureString` and `EmailString` are not made structural: their private members are deliberate, so that only a real instance can hold a secret.
- Controllers, routers, middlewares and services have no such need.
- `IAuthenticationProvider` mentions the `Member` class from node-ecies-lib in optional places only, so a plain object can omit them.

## Migration guide: 5.x to 6.0.0

All changes are compile-time. Runtime behaviour is unchanged. Passing a real `Application`, `BaseApplication`, `ServiceContainer`, `PluginManager` or `Environment` still compiles everywhere.

### Breaking changes

1. **Environment-only members through `app.environment`.** `app.environment` is `IEnvironment<TID>`, not the `Environment` class. These `Environment` members are not on the interface: `get`, `has`, `setEnvironment`, `getObject`, `requireMongo`, `dumpEnvironment`. Fix: type the value as `Environment<TID>`, or narrow with `instanceof Environment`. Nothing in this package used them through an `IApplication`.
2. **`app.services.clear()`.** `clear` is optional on `IServiceContainer`. Fix: `app.services.clear?.()`, or hold a `ServiceContainer`.
3. **Assigning `app.services` or `app.plugins` to class-typed variables.** `const c: ServiceContainer = app.services` and `const p: PluginManager = app.plugins` no longer compile. Fix: type them `IServiceContainer` and `IPluginManager<TID>`.
4. **Subclass redeclarations.** An interface that extends `IApplication` and redeclares `environment`, `services` or `plugins` still compiles when the redeclared type is assignable to the interface (for example a class that `implements IEnvironment`, `IServiceContainer` or `IPluginManager`). A redeclaration with a type that is not assignable to the interface fails. A class that `implements IApplication` and declares those members with the old class types still compiles.
5. **`IApplicationPlugin.init`, `IPluginManager.initAll` and `PluginManager.initAll` take `IApplicationPluginHost<TID>`** (the application core, `plugins`, `ready` and `start`). A plain-object host must provide `ready` and `start`, because plugins such as `MongoDatabasePlugin` forward them. `PluginManager.initAll` is only ever called with the full application, so callers passing a real application are unaffected.
6. **`IDatabaseInitializer.initialize` takes `IApplicationCore`** (no plugins, no lifecycle). An implementation that reads `app.plugins`, `app.ready` or `app.start` from a contextually typed parameter no longer compiles. Callers passing a full application are unaffected.
7. **`OpenApiController` constructor and `application` property are typed `IControllerApplication<TID>`**, not `IApplication<TID>`. Code that reads `openApiController.application.services` (or `.environment`, `.plugins`) no longer compiles. The same applies to a custom `BaseController` subclass that passes a narrower `TApplication`; with the default type argument nothing changes.
8. **Public type parameters and constraints.**
   - `TApplication` constraints are loosened or narrowed on `BaseController`, `DecoratorBaseController`, `AppRouter`, `BaseRouter`, `AdminEmailRouter`, `BaseService`, `AbstractJwtService`, `AbstractRoleService`, `FakeEmailService`, `DummyEmailService`. Defaults are unchanged, so existing instantiations compile. Code that reads members off `this.application` in a subclass with its own `TApplication extends IApplication<TID>` keeps working.
   - `OpenAPIController` gains a second type parameter with a default.
   - `PostfixEmailService<TID>` and `TransactionOptions<TID>` keep their type parameter but no longer use it (renamed `_TID`); explicit `<Buffer>` arguments still compile.
9. **Newly narrowed parameter types** (accept more, so no caller breaks): `authenticateToken`, `authenticateCrypto`, `useSessionEstablish` (`IAuthProviderPort<TID>`); `sendApiExpressValidationErrorResponse`, `TransactionOptions.application` (`IConstantsPort`); `PostfixEmailService` constructor (`IEnvironmentPort<IEmailSenderEnvironment>`); `UpnpPlugin.init` (`unknown`). Code that wraps or overrides these with the old wider parameter types still compiles.

### Additions

- Exports: `IEnvironmentPort`, `IConstantsPort`, `IServicesPort`, `IDatabasePort`, `IAuthProviderPort`, `IPluginsPort`, `IAppRouterEnvironment`, `IJwtServiceEnvironment`, `IEmailSenderEnvironment`, `IControllerApplication`, `IAppRouterApplication`, `IJwtServiceApplication`, `IApplicationCore`, `IApplicationPluginHost`, `IServiceContainer`, `IPluginManager`.
- `IApplicationPlugin` is now declared in `interfaces/plugin-manager.ts` and re-exported from `plugins/plugin-interface.ts`. Import paths and the package-root export are unchanged.

### Using a plain object

```ts
const controllerApp: IControllerApplication = {
  constants,
  database: undefined,
  authProvider,
};
new MyController(controllerApp); // MyController extends BaseController<..., IControllerApplication>
```

## Tests

`src/interfaces/__tests__/application-interfaces.spec.ts` is a type-level contract test:

- Each port and composite is satisfied by a plain object literal with no cast.
- Each router, controller, service and middleware signature accepts its port (type aliases and `Parameters<>` checks).
- A `@ts-expect-error` per port proves it still requires its members, and proves the class constraints (`AppRouter`, `BaseController`, `BaseService`, `authenticateToken`) still reject an object without the ports.
- Real `Application`-shaped values (`IApplication`) are assignable to every port; `ServiceContainer`, `PluginManager` and `Environment` satisfy the interfaces.
- ts-jest fails the file if an expected error disappears.

## Verification

The package's `jest.config.js` and tsconfigs resolve `../../tsconfig.base.json`, which does not exist from a worktree under `.worktrees/`, and `nx` targets run against the main checkout. The checks ran with temporary configs under `/tmp/nes-check` (same ts-jest preset, the package `.eslintrc.json`, paths from the repo `tsconfig.base.json`). Nothing in the repo was changed for this. Results are in the final commit message.

Consumer check (BrightChain, not modified): `/tmp/consumer-check/shim-check.ts` is the BrightCal shim without the `as ServiceContainer` and `as IBrightChainApplication` casts.

- `services: context.services` compiles without the cast. `IServiceContainer` accepts BrightChain's `ISubsystemContext.services` directly.
- `fullShim(shim): IBrightChainApplication` still fails: `IAppShimCore` lacks `getController`, `setController`, `getNodeId`, `reseedDevStore` and others. That is BrightChain's `IBrightChainApplication` surface, not this package.
- BrightCal's own router and controller (`createCalendarRouter`, `HolidayCatalogController`) take the full `IBrightChainApplication`. Narrowing them to a port is a change in BrightChain.
