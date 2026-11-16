# Application contract as interfaces (draft)

Branch `feat/application-interfaces`, base `be3ac7e` (v5.1.0). Draft for review. Not released, no version bump.

## Problem

`IApplication` referenced three classes with private members:

| `IApplication` member | Type before | Private/protected members | Type now |
| --- | --- | --- | --- |
| `environment` | `Environment<TID>` (`src/environment.ts`) | private `_environment`, `_envObject` | `IEnvironment<TID>` (already existed; `Environment` already `implements` it) |
| `services` | `ServiceContainer` (`src/container/service-container.ts`) | private `services`, `instances`, `singletons` | new `IServiceContainer` |
| `plugins` | `PluginManager<TID>` (`src/plugins/plugin-manager.ts`) | private `plugins`, `initialized` | new `IPluginManager<TID>` |

A class with a private or protected member is nominal in TypeScript. Only
that class, or a subclass, is assignable to it, so a plain object could never
satisfy `IApplication` or a `Pick<>` containing those members.

Members that were already structural:

- `constants: IConstants`. Interface that extends interfaces from node-ecies-lib, suite-core-lib and i18n-lib. No class members.
- `ready: boolean`, `start(): Promise<void>`.
- `database: IDatabase | undefined` (suite-core-lib interface).
- `authProvider: IAuthenticationProvider<TID> | undefined`. Interface. Its optional methods and the optional `IAuthenticatedUser.member` mention the `Member` class from node-ecies-lib (private fields). A plain object can omit them, so this does not block.
- `IApplication` extends no other type. `IApplication` has no `db`, `getModel`, `expressApp` or router members. `db` and `getModel` appear only in older test mocks, which cast.

## Consumers and implementations inside this package

Classes and code that name the types above:

- `BaseApplication`/`Application` (`src/application.ts`, `src/base-application.ts`): hold the real `Environment`, `ServiceContainer`, `PluginManager` instances. They return them from the getters, so they still satisfy the interface types. Unchanged.
- `PluginManager.initAll(app: IApplication<TID>)`, `IApplicationPlugin.init(app)`, `UpnpPlugin.init`.
- `BaseRouter`, `AppRouter`, `AdminEmailRouter`, `BaseController`, `OpenApiController`, `DatabaseInitializer`: take `TApplication extends IApplication<TID>`.
- Middlewares `authenticate-token`, `authenticate-crypto`, `session-unlock`: take `IApplication<TID>`, read only `application.authProvider`.
- `BaseController` reads `application.constants`.
- Nothing inside `src` calls an `Environment`-only member (`has`, `setEnvironment`, `dumpEnvironment`, the `systemPublicKeyHex` setter) or `ServiceContainer.clear` through an `IApplication`. The only `IApplication`-typed `services` use is `this.services.register(...)` in `application.ts`, which is on the interface.

## Change

- `src/interfaces/service-container.ts`: `IServiceContainer` (`register`, `get`, `has`, optional `clear`) and `ServiceFactory<T>`. Overloads are copied from the class, so `ServiceMap` typing for well-known keys is kept.
- `src/interfaces/plugin-manager.ts`: `IPluginManager<TID>` (`register`, `initAll`, `stopAll`, `get`, `has`).
- `ServiceContainer implements IServiceContainer`, `PluginManager implements IPluginManager<TID>`. Bodies unchanged.
- `ServiceFactory` is now declared in `interfaces/service-container.ts` and re-exported from `container/service-container.ts`, so `import { ServiceFactory } from '.../container'` still works.
- `IApplication` uses `IEnvironment<TID>`, `IServiceContainer`, `IPluginManager<TID>`. It no longer imports `Environment`, `ServiceContainer`, or `PluginManager`, which also removes an `interfaces -> classes` import cycle.
- Both new interfaces are exported from `src/interfaces/index.ts` (and so from the package root).
- Test: `src/interfaces/__tests__/application-interfaces.spec.ts` (compile-time checks plus two trivial runtime assertions).

## Compatibility

Source compatible for code that passes real instances: `Application`, `ServiceContainer`, `PluginManager` and `Environment` instances are all still assignable to `IApplication` and its members. All existing class exports stay.

What can break, for consumers that read the members off an `IApplication`-typed value:

1. `app.environment` is now `IEnvironment<TID>`, not the `Environment<TID>` class. Code that calls `Environment`-only members through the interface (`app.environment.has(...)`, `setEnvironment`, `dumpEnvironment`, the `systemPublicKeyHex` setter, `Environment.requireEnv` is static and unaffected) stops compiling. Fix: type the value as `Environment` or narrow with `instanceof`. Nothing in this package does this.
2. `app.services.clear()` and the `ServiceContainer` class type: `clear` is optional on the interface, so calling it needs `app.services.clear?.()`. Assigning `app.services` to a variable of type `ServiceContainer` no longer compiles. Fix: type it as `IServiceContainer`.
3. `app.plugins` is `IPluginManager<TID>`. Assigning it to a `PluginManager` variable no longer compiles. Same fix.
4. Subclass interfaces that redeclare `environment`/`services`/`plugins` with a class type (for example `IBrightChainApplication.environment: Environment<TID>` in BrightChain) keep compiling only if their class implements the interface, which BrightChain's `Environment` does (it extends the upstream `Environment`).

Open question for the reviewer: `clear` is optional on `IServiceContainer` so that the three-method container shapes downstream packages already declare (BrightChain's `IServiceContainer`) satisfy it with no change. If you prefer the full class surface, make it required. The consumer check below shows the effect.

## Not changed (remaining class-typed surface)

- `IEnvironment` itself still has class-typed fields from `@digitaldefiance/ecies-lib`: required `adminEmail`, `memberEmail`, `systemEmail: EmailString`, and optional `SecureString`/`SecureBuffer` fields. A plain object that provides a complete `IEnvironment` therefore needs real `EmailString` instances (constructible without a cast). Removing this needs interfaces in ecies-lib. Not touched here.
- Optional `BackupCode[]` fields on `IEnvironment` are a class from this package (`src/backup-code.ts`). Optional, so they do not block.
- `IAuthenticationProvider` mentions `Member` from node-ecies-lib in optional places only.
- Because `environment` is a full `IEnvironment`, a plain `Pick<IApplication, 'environment' | ...>` object must provide all of it. The test shows the pattern for narrower use: `Pick<IEnvironment, 'debug' | 'host' | ...>` on the member type.
- Routers, controllers and middlewares still require a complete `IApplication<TID>` (`TApplication extends IApplication<TID>`) even though they read only `authProvider` or `constants`. A consumer that wants to pass only a `Pick<>` into them needs those signatures narrowed (for example to `Pick<IApplication<TID>, 'authProvider'>`). That is a separate, behaviour-neutral follow-up that this draft does not make.

## Verification

The package's `jest.config.js` and tsconfigs resolve `../../tsconfig.base.json`, which does not exist from a worktree under `.worktrees/`. `nx` targets run against the main checkout, not the worktree. So the checks ran with equivalent temporary configs under `/tmp/nes-check` (same ts-jest preset, same `.eslintrc.json`, paths from the repo `tsconfig.base.json`). Nothing in the repo was changed for this.

- Type-check (`tsc --noEmit`, src + tests): no new errors. The set of errors in worktree files is identical before and after the change (206 lines, all in existing spec/test files, produced by the temp config being stricter than the package's ts-jest setup; none in non-test source).
- Library build equivalent (`tsc` with `declaration`, specs excluded): 0 errors in package source. 29 errors reported in sibling packages' sources pulled in through path mapping (`override` modifiers and similar), unrelated to this change.
- Tests (`jest`, all 132 suites): 132 passed, 2404 tests passed, including the new spec. The spec contains a `@ts-expect-error`, so ts-jest fails it if the expected type error disappears.
- Lint (`eslint` with the package `.eslintrc.json`, `src/**/*.ts` and `tests/**/*.ts`): 0 errors after `--fix` of three prettier-formatting issues in the new code.

## Consumer check (BrightChain, not modified)

Config and files: `/tmp/consumer-check/` (`gen.py` builds `tsconfig.json` from BrightChain's `tsconfig.base.json`, adds a path mapping `@digitaldefiance/node-express-suite` to this worktree's `src/index.ts`, and pins `ecies-lib`, `node-ecies-lib`, `suite-core-lib` and `i18n-lib` to BrightChain's `node_modules` so there is one copy of each). `shim-check.ts` is the BrightCal shim without the `as ServiceContainer` and `as IBrightChainApplication` casts.

Command: `cd /Volumes/Code/BrightChain && node node_modules/typescript/bin/tsc -p /tmp/consumer-check/tsconfig.json`

Result with `clear` required (first run): `services: context.services` failed with "Property 'clear' is missing" (BrightChain's `IServiceContainer` has register, get, has). That is why `clear` is now optional.

Result with the current branch:

- `services: context.services`, with no `as ServiceContainer`: compiles. This is the cast the shim needed for `services`.
- `IServiceContainer` from node-express-suite accepts BrightChain's `ISubsystemContext.services` directly: compiles.
- `const app: IBrightChainApplication = shim` (the cast removed): still fails: `IAppShimCore` is missing `getController`, `setController`, `getNodeId`, `reseedDevStore` and 4 more. Expected. The shim is a `Pick<>`, and the cast hid that it is not a full application.
- The only other errors in the run are in the worktree's own files and come from the temporary config (missing `greenlock-express` types, empty `export *` files under Bundler resolution, a missing `express-serve-static-core` module augmentation). None are in `shim-check.ts`.

Remaining blockers for removing `as IBrightChainApplication` entirely:

1. In this package: routers, controllers and middlewares still take the full `IApplication` (see above), and `createCalendarRouter`/`HolidayCatalogController` in BrightChain take the full `IBrightChainApplication`. Passing a `Pick<>` needs those signatures narrowed. In BrightChain, `IBrightChainApplication` adds `getController`, `setController`, `getNodeId`, `reseedDevStore`, and redeclares `environment` as BrightChain's own `Environment` class, which is a class with private members in BrightChain's package.
2. In ecies-lib: `EmailString`/`SecureString` in `IEnvironment` (see above).
