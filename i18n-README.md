# @digitaldefiance/i18n-lib

A comprehensive TypeScript internationalization library with plugin-based component registration, enum translation support, template processing, and context management.

## 🚀 New Plugin-Based Architecture

**Version 1.1.0** introduces a revolutionary plugin-based architecture with component registration and rigid compile-time type safety:

- **Component Registration System**: Register translation components with their own string keys
- **Language Plugin Support**: Add new languages dynamically with validation
- **Compile-Time Type Safety**: TypeScript ensures all strings are complete for all languages
- **Automatic Validation**: Comprehensive validation with detailed error reporting
- **Fallback System**: Intelligent fallback to default languages with missing translation detection
- **Multi-Instance Support**: Named instances for different application contexts

## Features

### Core Features

- **Type-Safe Translations**: Full TypeScript support with generic types for strings and languages
- **Plugin Architecture**: Register components and languages dynamically with full type safety
- **Configuration Validation**: Automatic validation ensures all languages have complete string collections
- **Localized Error Messages**: Error messages can be translated using the engine's own translation system
- **Enum Translation Registry**: Translate enum values with complete type safety
- **Template Processing**: Advanced template system with `{{EnumName.EnumKey}}` patterns and variable replacement
- **Context Management**: Admin vs user translation contexts with automatic language switching
- **Singleton Pattern**: Efficient instance management with named instances
- **Currency Formatting**: Built-in currency formatting utilities with locale support
- **Fallback System**: Graceful degradation when translations are missing
- **Extensible Configuration**: Module augmentation support for layered library extension
- **Backward Compatibility**: Legacy I18nEngine remains fully supported

### New Plugin Features

- **Component Registry**: Manage translation components with validation
- **Language Registry**: Dynamic language registration with metadata
- **Type-Safe Registration**: Compile-time guarantees for translation completeness
- **Validation Reporting**: Detailed missing translation reports
- **Plugin System**: Modular component architecture

## Installation

```bash
npm install @digitaldefiance/i18n-lib
```

## Quick Start

```typescript
import { I18nEngine, I18nConfig, createContext, CurrencyCode, Timezone } from '@digitaldefiance/i18n-lib';

// Define your enums
enum MyStrings {
  Welcome = 'welcome',
  UserGreetingTemplate = 'userGreetingTemplate'
}

enum MyLanguages {
  English = 'English',
  Spanish = 'Spanish'
}

// Configure the engine
const config: I18nConfig<MyStrings, MyLanguages> = {
  stringNames: Object.values(MyStrings),
  strings: {
    [MyLanguages.English]: {
      [MyStrings.Welcome]: 'Welcome!',
      [MyStrings.UserGreetingTemplate]: 'Hello, {name}!'
    },
    [MyLanguages.Spanish]: {
      [MyStrings.Welcome]: '¡Bienvenido!',
      [MyStrings.UserGreetingTemplate]: '¡Hola, {name}!'
    }
  },
  defaultLanguage: MyLanguages.English,
  defaultTranslationContext: 'user',
  defaultCurrencyCode: new CurrencyCode('USD'),
  languageCodes: {
    [MyLanguages.English]: 'en',
    [MyLanguages.Spanish]: 'es'
  },
  languages: Object.values(MyLanguages),
  timezone: new Timezone('UTC'),
  adminTimezone: new Timezone('UTC')
};

// Create engine
const i18n = new I18nEngine(config);

// Translate strings
const welcome = i18n.translate(MyStrings.Welcome);
// "Welcome!"

const greeting = i18n.translate(MyStrings.UserGreetingTemplate, { name: 'John' });
// "Hello, John!"

// Change language
i18n.context = { language: MyLanguages.Spanish };
const spanishGreeting = i18n.translate(MyStrings.UserGreetingTemplate, { name: 'Juan' });
// "¡Hola, Juan!"
```

## 🆕 Plugin-Based Architecture (New in v1.1.0)

The new plugin-based architecture provides a component registration system with rigid compile-time type safety.

### Quick Start with Plugin Architecture

```typescript
import { 
  createCoreI18nEngine, 
  CoreStringKey, 
  CoreLanguage,
  ComponentDefinition,
  ComponentRegistration
} from '@digitaldefiance/i18n-lib';

// Create engine with default languages and core strings
const i18n = createCoreI18nEngine('myapp');

// Use core translations
const welcomeMessage = i18n.translate('core', CoreStringKey.System_Welcome);
const errorMessage = i18n.translate('core', CoreStringKey.Error_ValidationFailed);

// Define your own component with type safety
enum MyComponentStringKey {
  Welcome = 'welcome',
  Goodbye = 'goodbye',
  UserGreetingTemplate = 'userGreetingTemplate'
}

const MyComponent: ComponentDefinition<MyComponentStringKey> = {
  id: 'my-component',
  name: 'My Custom Component',
  stringKeys: Object.values(MyComponentStringKey)
};

// Define translations for all supported languages
const myComponentStrings = {
  [CoreLanguage.EnglishUS]: {
    [MyComponentStringKey.Welcome]: 'Welcome to my component!',
    [MyComponentStringKey.Goodbye]: 'Goodbye from my component!',
    [MyComponentStringKey.UserGreetingTemplate]: 'Hello, {name}!'
  },
  [CoreLanguage.French]: {
    [MyComponentStringKey.Welcome]: 'Bienvenue dans mon composant !',
    [MyComponentStringKey.Goodbye]: 'Au revoir de mon composant !',
    [MyComponentStringKey.UserGreetingTemplate]: 'Bonjour, {name} !'
  },
  [CoreLanguage.Spanish]: {
    [MyComponentStringKey.Welcome]: '¡Bienvenido a mi componente!',
    [MyComponentStringKey.Goodbye]: '¡Adiós desde mi componente!',
    [MyComponentStringKey.UserGreetingTemplate]: '¡Hola, {name}!'
  }
  // TypeScript ensures all CoreLanguages are handled
};

// Register component (with validation)
const registration: ComponentRegistration<MyComponentStringKey, CoreLanguage> = {
  component: MyComponent,
  strings: myComponentStrings
};

const validationResult = i18n.registerComponent(registration);
if (!validationResult.isValid) {
  console.warn('Missing translations:', validationResult.missingKeys);
}

// Use your component's translations
const welcome = i18n.translate('my-component', MyComponentStringKey.Welcome);
const greeting = i18n.translate('my-component', MyComponentStringKey.UserGreetingTemplate, {
  name: 'John'
});

// Change language - affects all components
i18n.setLanguage(CoreLanguage.French);
const frenchWelcome = i18n.translate('my-component', MyComponentStringKey.Welcome);
// "Bienvenue dans mon composant !"
```

### Key Plugin Architecture Benefits

1. **Compile-Time Type Safety**: TypeScript ensures all string keys exist for all languages
2. **Component Isolation**: Each component manages its own strings independently  
3. **Flexible Language Support**: Components can support different subsets of system languages
4. **Comprehensive Validation**: Automatic detection of missing translations with detailed reporting
5. **Fallback System**: Intelligent fallback to default language when translations are missing
6. **Dynamic Language Addition**: Add new languages at runtime with automatic validation updates
7. **Extensibility**: Easy to add new languages and components dynamically

### Pre-built Components

The library includes several pre-built components:

#### Core I18n Component

Provides essential system strings in 8 languages:

- English (US/UK), French, Spanish, German, Chinese (Simplified), Japanese, Ukrainian

```typescript
import { createCoreI18nEngine, CoreStringKey } from '@digitaldefiance/i18n-lib';

const i18n = createCoreI18nEngine();
const saveText = i18n.translate('core', CoreStringKey.Common_Save);
const errorMsg = i18n.translate('core', CoreStringKey.Error_ValidationFailed);
```

#### User System Component (Example)

Demonstrates user management strings:

```typescript
import { 
  registerSuiteCoreComponent, 
  getUserTranslation, 
  UserStringKey 
} from '@digitaldefiance/i18n-lib';

// Register user system with existing engine
registerSuiteCoreComponent(i18n);

// Use user system translations
const loginText = getUserTranslation(UserStringKey.Auth_Login);
const userNotFound = getUserTranslation(
  UserStringKey.Error_UserNotFoundTemplate, 
  { username: 'john_doe' }
);
```

### Advanced Plugin Usage

#### Compile-Time Completeness Enforcement (Strict Mode)

By default the plugin engine performs runtime validation and provides fallbacks. If you want **compile-time** enforcement that every language mapping contains every string key, use the helper in `strict-types`:

```typescript
import { createCompleteComponentStrings } from '@digitaldefiance/i18n-lib';

enum MyStrings {
  Welcome = 'welcome',
  Farewell = 'farewell'
}

type AppLang = 'en' | 'fr';

// This will only compile if BOTH languages contain BOTH keys.
const myStrictStrings = createCompleteComponentStrings<MyStrings, AppLang>({
  en: {
    [MyStrings.Welcome]: 'Welcome',
    [MyStrings.Farewell]: 'Goodbye'
  },
  fr: {
    [MyStrings.Welcome]: 'Bienvenue',
    [MyStrings.Farewell]: 'Au revoir'
  }
});

// If any key is missing, TypeScript reports an error before runtime.
```

The core library itself uses this helper for the core component (`createCoreComponentStrings`) to guarantee internal completeness. For partial / iterative authoring you can still start with normal objects and later switch to the strict helper when translations stabilize.

#### Adding New Languages

```typescript
import { createLanguageDefinition } from '@digitaldefiance/i18n-lib';

// Add Italian support
const italian = createLanguageDefinition('it', 'Italiano', 'it');
i18n.registerLanguage(italian);

// Update existing components with Italian translations
i18n.updateComponentStrings('my-component', {
  it: {
    [MyComponentStringKey.Welcome]: 'Benvenuto nel mio componente!',
    [MyComponentStringKey.Goodbye]: 'Arrivederci dal mio componente!',
    [MyComponentStringKey.UserGreetingTemplate]: 'Ciao, {name}!'
  }
});
```

#### Component Registration Validation

The plugin engine provides comprehensive validation to ensure translation completeness:

```typescript
// Each component is validated against ALL system languages
enum MyStrings {
  Welcome = 'welcome',
  Goodbye = 'goodbye'
}

const myComponent: ComponentDefinition<MyStrings> = {
  id: 'my-component',
  name: 'My Component',
  stringKeys: Object.values(MyStrings)
};

// System has EN, FR, ES languages - component must provide translations for all three
const registration: ComponentRegistration<MyStrings, CoreLanguage> = {
  component: myComponent,
  strings: {
    [CoreLanguage.EnglishUS]: {
      [MyStrings.Welcome]: 'Welcome',
      [MyStrings.Goodbye]: 'Goodbye'
    },
    [CoreLanguage.French]: {
      [MyStrings.Welcome]: 'Bienvenue',
      [MyStrings.Goodbye]: 'Au revoir'
    },
    [CoreLanguage.Spanish]: {
      [MyStrings.Welcome]: 'Bienvenido', 
      [MyStrings.Goodbye]: 'Adiós'
    }
  }
};

const result = i18n.registerComponent(registration);
if (!result.isValid) {
  console.log('Missing translations:', result.missingKeys);
  // Shows exactly which string keys are missing for which languages
}
```

#### Flexible Language Support

Components can support different subsets of system languages:

```typescript
// Component A supports EN, FR, ES
const componentA = {
  component: { id: 'comp-a', name: 'Component A', stringKeys: ['hello'] },
  strings: {
    en: { hello: 'Hello' },
    fr: { hello: 'Bonjour' },
    es: { hello: 'Hola' }
  }
};

// Component B only supports EN and DE (added later)
const componentB = {
  component: { id: 'comp-b', name: 'Component B', stringKeys: ['save'] },
  strings: {
    en: { save: 'Save' },
    de: { save: 'Speichern' }
  }
};

// Both components can coexist - missing translations use fallback
i18n.registerComponent(componentA); // ✓ Complete
i18n.registerComponent(componentB); // ⚠ Missing FR, ES - uses fallback

// Usage automatically handles fallbacks
i18n.translate('comp-b', 'save', {}, 'fr'); // Returns 'Save' (EN fallback)
```

#### Dynamic Language Addition

```typescript
// Add new language to system
const germanLang = { id: 'de', name: 'German', code: 'de' };
i18n.registerLanguage(germanLang);

// New component registrations now require German translations
const newRegistration = {
  component: { id: 'new-comp', name: 'New Component', stringKeys: ['test'] },
  strings: {
    en: { test: 'Test' },
    fr: { test: 'Test' },
    es: { test: 'Prueba' }
    // Missing 'de' - validation will flag this
  }
};

const result = i18n.registerComponent(newRegistration);
console.log(result.missingKeys); // Shows missing German translations
```

#### Validation and Error Handling

```typescript
// Comprehensive validation
const globalValidation = i18n.validateAllComponents();
if (!globalValidation.isValid) {
  console.error('Validation errors:', globalValidation.errors);
  console.warn('Warnings:', globalValidation.warnings);
}

// Handle registration errors
try {
  i18n.registerComponent(incompleteRegistration);
} catch (error) {
  if (error instanceof RegistryError) {
    console.error(`Registry error: ${error.type}`, error.metadata);
  }
}

// Strict validation mode (rejects incomplete registrations)
const strictEngine = new PluginI18nEngine(languages, {
  validation: {
    requireCompleteStrings: true,
    allowPartialRegistration: false,
    fallbackLanguageId: 'en'
  }
});
```

#### Multi-Instance Support

```typescript
// Create separate instances for different contexts
const adminI18n = PluginI18nEngine.createInstance('admin', languages);
const userI18n = PluginI18nEngine.createInstance('user', languages);

// Register different components for each
adminI18n.registerComponent(adminComponentRegistration);
userI18n.registerComponent(userComponentRegistration);
```

For complete documentation on the plugin architecture, see [PLUGIN_ARCHITECTURE.md](./PLUGIN_ARCHITECTURE.md).

## Advanced Features

### Enum Translation Registry

```typescript
enum Status {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending'
}

// Register enum translations (requires complete translations)
i18n.registerEnum(Status, {
  [MyLanguages.English]: {
    [Status.Active]: 'Active',
    [Status.Inactive]: 'Inactive',
    [Status.Pending]: 'Pending'
  },
  [MyLanguages.Spanish]: {
    [Status.Active]: 'Activo',
    [Status.Inactive]: 'Inactivo',
    [Status.Pending]: 'Pendiente'
  }
}, 'Status');

// Translate enum values
const statusText = i18n.translateEnum(Status, Status.Active, MyLanguages.Spanish);
// "Activo"
```

### Template Processing

```typescript
enum AppStrings {
  WelcomeMessage = 'welcomeMessage',
  UserGreetingTemplate = 'userGreetingTemplate'
}

const config: I18nConfig<AppStrings, MyLanguages> = {
  // ... other config
  enumName: 'AppStrings',
  enumObj: AppStrings,
  strings: {
    [MyLanguages.English]: {
      [AppStrings.WelcomeMessage]: 'Welcome to our app!',
      [AppStrings.UserGreetingTemplate]: 'Hello, {name}!'
    }
  }
};

const i18n = new I18nEngine(config);

// Use template processor
const message = i18n.t('{{AppStrings.WelcomeMessage}} {{AppStrings.UserGreetingTemplate}}', 
  MyLanguages.English, 
  { name: 'John' }
);
// "Welcome to our app! Hello, John!"
```

### Context Management

```typescript
import { createContext, setLanguage, setAdminLanguage, setContext } from '@digitaldefiance/i18n-lib';

// Create and manage context
const context = createContext(MyLanguages.English, 'user');

// Set different languages for user and admin contexts
setLanguage(context, MyLanguages.Spanish);
setAdminLanguage(context, MyLanguages.English);

// Switch between contexts
setContext(context, 'admin'); // Uses admin language
setContext(context, 'user');  // Uses user language

// Apply context to engine
i18n.context = context;
```

### Context Change Monitoring

```typescript
import { ContextManager } from '@digitaldefiance/i18n-lib';

interface AppContext {
  language: string;
  theme: string;
}

const manager = new ContextManager<AppContext>();

// Add listeners for context changes
manager.addListener((property, oldValue, newValue) => {
  console.log(`${property} changed from ${oldValue} to ${newValue}`);
});

// Create reactive context
const context = { language: 'en', theme: 'dark' };
const reactiveContext = manager.createProxy(context);

// Changes are automatically detected
reactiveContext.language = 'es'; // Triggers listener
```

### Currency Formatting

```typescript
import { getCurrencyFormat } from '@digitaldefiance/i18n-lib';

// Get currency formatting information
const usdFormat = getCurrencyFormat('en-US', 'USD');
// { symbol: '$', position: 'prefix', groupSeparator: ',', decimalSeparator: '.' }

const eurFormat = getCurrencyFormat('de-DE', 'EUR');
// { symbol: '€', position: 'postfix', groupSeparator: '.', decimalSeparator: ',' }
```

### Instance Management

```typescript
// Create named instances
const mainI18n = new I18nEngine(config, 'main');
const adminI18n = new I18nEngine(adminConfig, 'admin');

// Get instances by key
const instance = I18nEngine.getInstance('main');

// Clean up instances (useful for testing)
I18nEngine.clearInstances();
I18nEngine.removeInstance('main');
```

## API Reference

### Plugin Architecture API

#### PluginI18nEngine

**Constructor**

- `new PluginI18nEngine<TLanguages>(languages, config?)` - Create new plugin engine
- `PluginI18nEngine.createInstance<TLanguages>(key, languages, config?)` - Create named instance
- `PluginI18nEngine.getInstance<TLanguages>(key?)` - Get existing instance

**Component Management**

- `registerComponent<TStringKeys>(registration)` - Register component with translations
- `updateComponentStrings<TStringKeys>(componentId, strings)` - Update existing component strings
- `getComponents()` - Get all registered components
- `hasComponent(componentId)` - Check if component exists

**Translation Methods**

- `translate<TStringKeys>(componentId, stringKey, variables?, language?)` - Translate component string
- `safeTranslate(componentId, stringKey, variables?, language?)` - Safe translate with fallback
- `getTranslationDetails<TStringKeys>(componentId, stringKey, variables?, language?)` - Get detailed translation response

**Language Management**

- `registerLanguage(language)` - Register new language
- `registerLanguages(languages)` - Register multiple languages
- `getLanguages()` - Get all registered languages
- `hasLanguage(language)` - Check if language exists
- `setLanguage(language)` - Set current language
- `getLanguageByCode(code)` - Get language by ISO code

**Validation**

- `validateAllComponents()` - Validate all registered components
- `getLanguageRegistry()` - Access language registry directly
- `getComponentRegistry()` - Access component registry directly

#### Core I18n Functions

- `createCoreI18nEngine(instanceKey?)` - Create engine with core components
- `getCoreTranslation(stringKey, variables?, language?, instanceKey?)` - Get core translation
- `safeCoreTranslation(stringKey, variables?, language?, instanceKey?)` - Safe core translation

#### Component Registration Types

```typescript
interface ComponentDefinition<TStringKeys extends string> {
  readonly id: string;
  readonly name: string;
  readonly stringKeys: readonly TStringKeys[];
}

interface ComponentRegistration<TStringKeys extends string, TLanguages extends string> {
  readonly component: ComponentDefinition<TStringKeys>;
  readonly strings: PartialComponentLanguageStrings<TStringKeys, TLanguages>;
}

interface LanguageDefinition {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly isDefault?: boolean;
}
```

### Legacy I18nEngine (Still Supported)

#### Constructor

- `new I18nEngine<TStringKey, TLanguage>(config, key?)` - Create new engine instance

#### Translation Methods

- `translate(key, vars?, language?, fallbackLanguage?)` - Translate string with optional variables
- `translateEnum(enumObj, value, language)` - Translate enum value
- `t(templateString, language?, ...vars)` - Process template string with `{{EnumName.EnumKey}}` patterns

#### Registration

- `registerEnum(enumObj, translations, enumName)` - Register enum translations

#### Language Management

- `getLanguageCode(language)` - Get language code for language
- `getLanguageFromCode(code)` - Get language from code
- `getAllLanguageCodes()` - Get all language codes
- `getAvailableLanguages()` - Get available languages
- `isLanguageAvailable(language)` - Check if language is available

#### Context Management

- `get context()` - Get current context
- `set context(context)` - Set context properties

#### Static Methods

- `getInstance(key?)` - Get instance by key
- `clearInstances()` - Clear all instances
- `removeInstance(key?)` - Remove specific instance

### Context Utilities

- `createContext(defaultLanguage, defaultContext)` - Create new context
- `setLanguage(context, language)` - Set user language
- `setAdminLanguage(context, language)` - Set admin language
- `setContext(context, contextType)` - Set context type

### ContextManager

- `addListener(listener)` - Add change listener
- `removeListener(listener)` - Remove change listener
- `createProxy(context)` - Create reactive context proxy

### Currency Utilities

- `getCurrencyFormat(locale, currencyCode)` - Get currency formatting info

### Type Utilities

- `createTranslations(translations)` - Helper for creating typed translations

## Type Definitions

### Core Types

```typescript
type EnumTranslation<T extends string | number> = {
  [K in T]: string;
};

type EnumLanguageTranslation<T extends string | number, TLanguage extends string> = Partial<{
  [L in TLanguage]: EnumTranslation<T>;
}>;

interface I18nConfig<TStringKey, TLanguage, TConstants?, TTranslationContext?> {
  stringNames: TStringKey[];
  strings: MasterStringsCollection<TStringKey, TLanguage>;
  defaultLanguage: TLanguage;
  defaultTranslationContext: TTranslationContext;
  defaultCurrencyCode: CurrencyCode;
  languageCodes: LanguageCodeCollection<TLanguage>;
  languages: TLanguage[];
  constants?: TConstants;
  enumName?: string;
  enumObj?: Record<string, TStringKey>;
  timezone: Timezone;
  adminTimezone: Timezone;
}
```

## Testing

The library includes comprehensive test coverage:

```bash
# Run tests
yarn test

# Run specific test suites
yarn test context-manager.spec.ts
yarn test enum-registry.spec.ts
yarn test i18n-engine.spec.ts
```

### Test Cleanup and Instance Management

For proper test isolation when using the plugin-based architecture, use the cleanup utilities:

```typescript
import { PluginI18nEngine, resetAllI18nEngines } from '@digitaldefiance/i18n-lib';

describe('My tests', () => {
  beforeEach(() => {
    // Clean up any existing instances before each test
    PluginI18nEngine.clearAllInstances();
  });

  afterEach(() => {
    // Or use the convenience function
    resetAllI18nEngines();
  });

  // Or use specific cleanup methods
  it('should manage instances', () => {
    const engine1 = PluginI18nEngine.createInstance('app1', [englishLang]);
    const engine2 = PluginI18nEngine.createInstance('app2', [frenchLang]);

    // Check if instances exist
    expect(PluginI18nEngine.hasInstance('app1')).toBe(true);
    expect(PluginI18nEngine.hasInstance('app2')).toBe(true);

    // Remove specific instance
    PluginI18nEngine.removeInstance('app1');
    expect(PluginI18nEngine.hasInstance('app1')).toBe(false);

    // Clear all instances and component registrations
    PluginI18nEngine.resetAll();
    expect(PluginI18nEngine.hasInstance('app2')).toBe(false);
  });
});
```

#### Available Cleanup Methods

- `PluginI18nEngine.clearAllInstances()` - Remove all engine instances
- `PluginI18nEngine.removeInstance(key?)` - Remove specific instance by key
- `PluginI18nEngine.hasInstance(key?)` - Check if instance exists  
- `PluginI18nEngine.resetAll()` - Clear instances and component registrations
- `resetAllI18nEngines()` - Convenience function that calls `resetAll()`

## Extensible Configuration

The library supports layered extension across multiple libraries using TypeScript module augmentation:

### Base Library Setup

```typescript
// In your base library
import { DefaultStringKey, DefaultLanguage } from '@digitaldefiance/i18n-lib';

enum MyLibStringKey {
  Feature_Save = 'feature_save',
  Feature_Load = 'feature_load',
}

// Extend the global configuration
declare global {
  namespace I18n {
    interface Config {
      StringKey: DefaultStringKey | MyLibStringKey;
    }
  }
}
```

### Extending Another Library

```typescript
// In a library that extends the base library
import { DefaultStringKey } from '@digitaldefiance/i18n-lib';
import { MyLibStringKey } from 'my-base-lib';

enum AdvancedStringKey {
  Advanced_Export = 'advanced_export',
  Advanced_Import = 'advanced_import',
}

// Extend with union types
declare global {
  namespace I18n {
    interface Config {
      StringKey: DefaultStringKey | MyLibStringKey | AdvancedStringKey;
    }
  }
}
```

### Final Application

```typescript
// In your final application
import { StringKey, Language, getI18nEngine } from 'my-extended-lib';

// All string keys from all layers are now available
const engine = getI18nEngine();
const translation = engine.translate('advanced_export' as StringKey);
```

### Default Configuration Helper

Use the default configuration helper for quick setup:

```typescript
import { getDefaultI18nEngine } from '@digitaldefiance/i18n-lib';

// Create engine with default configuration
const engine = getDefaultI18nEngine(
  { APP_NAME: 'MyApp' }, // constants
  new Timezone('America/New_York'), // user timezone
  new Timezone('UTC') // admin timezone
);
```

## Configuration Validation

The engine automatically validates configurations during construction to ensure completeness:

### Validation Rules

1. **All languages in `languageCodes` must have corresponding `strings` collections**
2. **All `stringNames` must be present in every language's string collection**
3. **The `defaultLanguage` must have a string collection**

### Localized Error Messages

Validation errors can be localized by including error message keys in your configuration:

```typescript
enum MyStrings {
  Welcome = 'welcome',
  // Error message keys
  Error_MissingStringCollectionTemplate = 'error_missing_string_collection_template',
  Error_MissingTranslationTemplate = 'error_missing_translation_template',
  Error_DefaultLanguageNoCollectionTemplate = 'error_default_language_no_collection_template'
}

const config: I18nConfig<MyStrings, MyLanguages> = {
  stringNames: Object.values(MyStrings),
  strings: {
    [MyLanguages.English]: {
      [MyStrings.Welcome]: 'Welcome!',
      [MyStrings.Error_MissingStringCollectionTemplate]: 'Missing translations for language: {language}',
      [MyStrings.Error_MissingTranslationTemplate]: 'Key \'{key}\' not found in {language}',
      [MyStrings.Error_DefaultLanguageNoCollectionTemplate]: 'Default language \'{language}\' has no translations'
    }
  },
  // ... rest of config
};
```

### Fallback Error Messages

If localized error messages aren't provided, the engine falls back to English templates:

- `Missing string collection for language: {language}`
- `Missing translation for key '{key}' in language '{language}'`
- `Default language '{language}' has no string collection`

## Best Practices

### Plugin Architecture (Recommended for New Projects)

1. **Use Component Registration**: Organize translations into logical components with `PluginI18nEngine`
2. **Define String Key Enums**: Always use TypeScript enums for string keys to ensure compile-time type safety
3. **Complete Component Translations**: Provide translations for all supported languages in each component
4. **Validate Registrations**: Check validation results and handle missing translations appropriately
5. **Use Core Components**: Start with `createCoreI18nEngine()` for built-in system strings
6. **Fallback Strategy**: Configure appropriate fallback languages for missing translations
7. **Component Isolation**: Keep related strings together in the same component
8. **Template Variables**: Use template strings with variables for dynamic content
9. **Multi-Instance Architecture**: Use named instances for different application contexts (admin, user, etc.)

### Legacy System (Still Supported)

1. **Complete Translations**: EnumTranslation requires all enum values to be translated
2. **Type Safety**: Use TypeScript enums for string keys and languages
3. **Context Separation**: Use different contexts for admin and user interfaces
4. **Instance Management**: Use named instances for different parts of your application
5. **Error Handling**: Handle missing translations gracefully with fallback languages
6. **Layered Extension**: Use union types when extending configurations across libraries
7. **Default Configuration**: Use `getDefaultI18nEngine()` for standard setups

### Migration Strategy

When migrating from legacy to plugin architecture:

```typescript
// Legacy approach
const legacy = new I18nEngine(config);
const text = legacy.translate(MyStrings.Welcome);

// New plugin approach  
const modern = createCoreI18nEngine();
modern.registerComponent(myComponentRegistration);
const text = modern.translate('my-component', MyStrings.Welcome);
```

Both systems can coexist in the same application during migration.

## License

MIT

## Repository

Part of the DigitalBurnbag project - a secure file sharing and automated protocol system.

## ChangeLog

### Version 1.1.2

- Sat Oct 11 2025 19:25:00 GMT-0700 (Pacific Daylight Time)
  - Added cleanup mechanisms for other modules to deregister, etc.

### Version 1.1.1

- Sat Oct 11 2025 17:47:00 GMT-0700 (Pacific Daylight Time)
  - Improved type checking for completeness of component translations during registration
  - Updated README/Migration guide for clarity.

### Version 1.1.0

- Sat Oct 11 2025 16:49:00 GMT-0700 (Pacific Daylight Time)
  - Introduced plugin-based architecture with component registration and compile-time type safety
  - Added `PluginI18nEngine` with comprehensive validation and fallback system
  - Maintained full support for legacy `I18nEngine`
  - Added pre-built core and user system components
  - Enhanced template processing and context management features
  - Improved documentation and examples for both architectures

### Version 1.0.33

- Wed Sep 24 2025 15:20:07 GMT-0700 (Pacific Daylight Time)
  - Initial release of the TypeScript internationalization library with enum translation, template processing, context management, and currency formatting.
