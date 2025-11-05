# Migration Guide: Legacy I18n to Plugin-Based Architecture

This guide provides step-by-step instructions for migrating from the legacy `I18nEngine` to the new plugin-based architecture in `@digitaldefiance/i18n-lib`.

## Overview of Changes

The new plugin-based architecture introduces:

- **Component-based organization**: Translations are organized into logical components
- **Compile-time type safety**: TypeScript ensures all strings are complete for all languages
- **Registration system**: Components and languages are registered dynamically
- **Validation system**: Comprehensive validation with detailed error reporting
- **Fallback system**: Intelligent fallback to default languages

## Migration Steps

### Step 1: Identify Your Current Setup

**Legacy Pattern:**

```typescript
// Old way - single monolithic configuration
enum AppStrings {
  Welcome = 'welcome',
  Save = 'save',
  Delete = 'delete',
  UserNotFoundTemplate = 'userNotFoundTemplate'
}

enum AppLanguages {
  English = 'English',
  Spanish = 'Spanish',
  French = 'French'
}

const config: I18nConfig<AppStrings, AppLanguages> = {
  stringNames: Object.values(AppStrings),
  strings: {
    [AppLanguages.English]: {
      [AppStrings.Welcome]: 'Welcome',
      [AppStrings.Save]: 'Save',
      [AppStrings.Delete]: 'Delete',
      [AppStrings.UserNotFoundTemplate]: 'User "{username}" not found'
    },
    // ... other languages
  },
  defaultLanguage: AppLanguages.English,
  // ... rest of config
};

const i18n = new I18nEngine(config);
```

### Step 2: Install and Import New Components

```typescript
// New imports
import {
  createCoreI18nEngine,
  PluginI18nEngine,
  ComponentDefinition,
  ComponentRegistration,
  CoreLanguage,
  CoreStringKey
} from '@digitaldefiance/i18n-lib';
```

### Step 3: Migrate to Core Languages

**Replace custom language enums with CoreLanguage:**

```typescript
// Old way
enum AppLanguages {
  English = 'English',
  Spanish = 'Spanish', 
  French = 'French'
}

// New way - use CoreLanguage
import { CoreLanguage } from '@digitaldefiance/i18n-lib';
// CoreLanguage.EnglishUS, CoreLanguage.Spanish, CoreLanguage.French are available
```

### Step 4: Break Down Strings into Components

**Organize your strings by functional area:**

```typescript
// Old way - everything in one enum
enum AppStrings {
  Welcome = 'welcome',
  Save = 'save',
  Delete = 'delete',
  Login = 'login',
  Logout = 'logout',
  UserNotFoundTemplate = 'userNotFoundTemplate',
  ProfileSaved = 'profileSaved'
}

// New way - separate by component
enum GeneralStrings {
  Welcome = 'welcome',
  Save = 'save',
  Delete = 'delete'
}

enum AuthStrings {
  Login = 'login',
  Logout = 'logout'
}

enum UserStrings {
  UserNotFoundTemplate = 'userNotFoundTemplate',
  ProfileSaved = 'profileSaved'
}
```

### Step 5: Create Component Definitions

```typescript
// Define your components
const GeneralComponent: ComponentDefinition<GeneralStrings> = {
  id: 'general',
  name: 'General UI Strings',
  stringKeys: Object.values(GeneralStrings)
};

const AuthComponent: ComponentDefinition<AuthStrings> = {
  id: 'auth',
  name: 'Authentication Strings',
  stringKeys: Object.values(AuthStrings)
};

const UserComponent: ComponentDefinition<UserStrings> = {
  id: 'user',
  name: 'User Management Strings',
  stringKeys: Object.values(UserStrings)
};
```

### Step 6: Create Translation Objects

```typescript
// Organize translations by component and language
const generalStrings = {
  [CoreLanguage.EnglishUS]: {
    [GeneralStrings.Welcome]: 'Welcome',
    [GeneralStrings.Save]: 'Save',
    [GeneralStrings.Delete]: 'Delete'
  },
  [CoreLanguage.Spanish]: {
    [GeneralStrings.Welcome]: 'Bienvenido',
    [GeneralStrings.Save]: 'Guardar', 
    [GeneralStrings.Delete]: 'Eliminar'
  },
  [CoreLanguage.French]: {
    [GeneralStrings.Welcome]: 'Bienvenue',
    [GeneralStrings.Save]: 'Enregistrer',
    [GeneralStrings.Delete]: 'Supprimer'
  }
};

const authStrings = {
  [CoreLanguage.EnglishUS]: {
    [AuthStrings.Login]: 'Login',
    [AuthStrings.Logout]: 'Logout'
  },
  [CoreLanguage.Spanish]: {
    [AuthStrings.Login]: 'Iniciar sesión',
    [AuthStrings.Logout]: 'Cerrar sesión'
  },
  [CoreLanguage.French]: {
    [AuthStrings.Login]: 'Se connecter',
    [AuthStrings.Logout]: 'Se déconnecter'
  }
};

const userStrings = {
  [CoreLanguage.EnglishUS]: {
    [UserStrings.UserNotFoundTemplate]: 'User "{username}" not found',
    [UserStrings.ProfileSaved]: 'Profile saved successfully'
  },
  [CoreLanguage.Spanish]: {
    [UserStrings.UserNotFoundTemplate]: 'Usuario "{username}" no encontrado',
    [UserStrings.ProfileSaved]: 'Perfil guardado exitosamente'
  },
  [CoreLanguage.French]: {
    [UserStrings.UserNotFoundTemplate]: 'Utilisateur "{username}" non trouvé',
    [UserStrings.ProfileSaved]: 'Profil enregistré avec succès'
  }
};
```

### Step 7: Create Component Registrations

```typescript
const generalRegistration: ComponentRegistration<GeneralStrings, CoreLanguage> = {
  component: GeneralComponent,
  strings: generalStrings
};

const authRegistration: ComponentRegistration<AuthStrings, CoreLanguage> = {
  component: AuthComponent,
  strings: authStrings
};

const userRegistration: ComponentRegistration<UserStrings, CoreLanguage> = {
  component: UserComponent,
  strings: userStrings
};
```

### Step 8: Initialize New Engine and Register Components

```typescript
// Create engine with core system strings
const i18n = createCoreI18nEngine('myapp');

// Register your components
const generalResult = i18n.registerComponent(generalRegistration);
const authResult = i18n.registerComponent(authRegistration);
const userResult = i18n.registerComponent(userRegistration);

// Handle validation results
if (!generalResult.isValid) {
  console.warn('General component missing translations:', generalResult.missingKeys);
}
if (!authResult.isValid) {
  console.warn('Auth component missing translations:', authResult.missingKeys);
}
if (!userResult.isValid) {
  console.warn('User component missing translations:', userResult.missingKeys);
}
```

### Step 9: Update Translation Calls

**Change from single-parameter to component-based calls:**

```typescript
// Old way
const welcomeText = i18n.translate(AppStrings.Welcome);
const saveText = i18n.translate(AppStrings.Save);
const loginText = i18n.translate(AppStrings.Login);
const userError = i18n.translate(AppStrings.UserNotFoundTemplate, { username: 'john' });

// New way
const welcomeText = i18n.translate('general', GeneralStrings.Welcome);
const saveText = i18n.translate('general', GeneralStrings.Save);
const loginText = i18n.translate('auth', AuthStrings.Login);
const userError = i18n.translate('user', UserStrings.UserNotFoundTemplate, { username: 'john' });

// You can also use core system strings
const errorText = i18n.translate('core', CoreStringKey.Common_Error);
const okText = i18n.translate('core', CoreStringKey.Common_OK);
```

### Step 10: Update Language Switching

```typescript
// Old way
i18n.context = { language: AppLanguages.Spanish };

// New way
i18n.setLanguage(CoreLanguage.Spanish);

// Or update context
i18n.updateContext({ currentLanguage: CoreLanguage.Spanish });
```

### Step 11: Create Helper Functions (Optional)

**Create component-specific helper functions for cleaner code:**

```typescript
// Helper functions for each component
export function getGeneralTranslation(
  key: GeneralStrings,
  variables?: Record<string, string | number>,
  language?: CoreLanguage
): string {
  const engine = PluginI18nEngine.getInstance<CoreLanguage>();
  return engine.translate('general', key, variables, language);
}

export function getAuthTranslation(
  key: AuthStrings,
  variables?: Record<string, string | number>,
  language?: CoreLanguage
): string {
  const engine = PluginI18nEngine.getInstance<CoreLanguage>();
  return engine.translate('auth', key, variables, language);
}

export function getUserTranslation(
  key: UserStrings,
  variables?: Record<string, string | number>,
  language?: CoreLanguage
): string {
  const engine = PluginI18nEngine.getInstance<CoreLanguage>();
  return engine.translate('user', key, variables, language);
}

// Usage
const welcomeText = getGeneralTranslation(GeneralStrings.Welcome);
const loginText = getAuthTranslation(AuthStrings.Login);
const userError = getUserTranslation(UserStrings.UserNotFoundTemplate, { username: 'john' });
```

## Common Migration Patterns

### Pattern 1: Single Component Migration

If you have a small application, you might migrate everything to a single component:

```typescript
// Define one large component with all your strings
enum AppStrings {
  // All your existing strings
}

const AppComponent: ComponentDefinition<AppStrings> = {
  id: 'app',
  name: 'Application Strings',
  stringKeys: Object.values(AppStrings)
};

// Create helper function
export function getAppTranslation(
  key: AppStrings,
  variables?: Record<string, string | number>,
  language?: CoreLanguage
): string {
  const engine = PluginI18nEngine.getInstance<CoreLanguage>();
  return engine.translate('app', key, variables, language);
}
```

### Pattern 2: Gradual Migration

You can run both systems in parallel during migration:

```typescript
// Keep old system running
const legacyI18n = new I18nEngine(legacyConfig);

// Add new system
const modernI18n = createCoreI18nEngine('modern');
modernI18n.registerComponent(newComponentRegistration);

// Use appropriate system
const legacyText = legacyI18n.translate(OldStrings.SomeKey);
const modernText = modernI18n.translate('new-component', NewStrings.SomeKey);
```

### Pattern 3: Enum Translation Migration

```typescript
// Old way
enum Status {
  Active = 'active',
  Inactive = 'inactive'
}

i18n.registerEnum(Status, {
  [AppLanguages.English]: {
    [Status.Active]: 'Active',
    [Status.Inactive]: 'Inactive'
  }
}, 'Status');

const statusText = i18n.translateEnum(Status, Status.Active);

// New way - enums are now handled through the regular component system
enum StatusStrings {
  Active = 'status_active',
  Inactive = 'status_inactive'
}

// Create a mapping function
function getStatusString(status: Status): StatusStrings {
  switch (status) {
    case Status.Active: return StatusStrings.Active;
    case Status.Inactive: return StatusStrings.Inactive;
  }
}

// Use in component
const statusText = i18n.translate('app', getStatusString(Status.Active));
```

## Validation and Error Handling

The new system provides comprehensive validation that ensures translation completeness:

### Component Validation Rules

1. **System-Wide Language Validation**: Each component is validated against ALL languages registered in the system
2. **Flexible Language Support**: Components can support different subsets of system languages
3. **Missing Translation Detection**: Detailed reporting of exactly which translations are missing
4. **Fallback System**: Components with missing translations automatically fall back to the default language
5. **Dynamic Language Addition**: When new languages are added, future component registrations are validated against the expanded language set

### Validation Examples

```typescript
// System has EN, FR, ES languages registered
const i18n = createCoreI18nEngine('myapp');

// Component A - Complete registration (supports all system languages)
const completeRegistration = {
  component: { id: 'comp-a', name: 'Component A', stringKeys: ['hello', 'goodbye'] },
  strings: {
    [CoreLanguage.EnglishUS]: { hello: 'Hello', goodbye: 'Goodbye' },
    [CoreLanguage.French]: { hello: 'Bonjour', goodbye: 'Au revoir' },
    [CoreLanguage.Spanish]: { hello: 'Hola', goodbye: 'Adiós' }
  }
};

const result1 = i18n.registerComponent(completeRegistration);
console.log(result1.isValid); // true - all languages supported

// Component B - Partial registration (missing Spanish)
const partialRegistration = {
  component: { id: 'comp-b', name: 'Component B', stringKeys: ['save', 'cancel'] },
  strings: {
    [CoreLanguage.EnglishUS]: { save: 'Save', cancel: 'Cancel' },
    [CoreLanguage.French]: { save: 'Enregistrer', cancel: 'Annuler' }
    // Missing Spanish translations
  }
};

const result2 = i18n.registerComponent(partialRegistration);
console.log(result2.isValid); // false - missing Spanish
console.log(result2.missingKeys); 
// [
//   { languageId: 'es', componentId: 'comp-b', stringKey: 'save' },
//   { languageId: 'es', componentId: 'comp-b', stringKey: 'cancel' }
// ]

// Component is still registered (allowPartialRegistration: true by default)
// Missing translations fall back to English
i18n.translate('comp-b', 'save', {}, CoreLanguage.Spanish); // Returns 'Save' (fallback)

// Add new language dynamically
const germanLang = { id: 'de', name: 'German', code: 'de' };
i18n.registerLanguage(germanLang);

// Future registrations now require German translations
const futureRegistration = {
  component: { id: 'comp-c', name: 'Component C', stringKeys: ['delete'] },
  strings: {
    [CoreLanguage.EnglishUS]: { delete: 'Delete' },
    [CoreLanguage.French]: { delete: 'Supprimer' },
    [CoreLanguage.Spanish]: { delete: 'Eliminar' }
    // Missing German - will be flagged
  }
};

const result3 = i18n.registerComponent(futureRegistration);
console.log(result3.isValid); // false - missing German
```

### Strict Validation Mode

### Compile-Time Strict Completeness (Optional)

If you want the compiler to refuse builds when any translation is missing for a component, use the `createCompleteComponentStrings` helper:

```typescript
import { createCompleteComponentStrings } from '@digitaldefiance/i18n-lib';

enum ProfileStrings {
  Header = 'header',
  SaveSuccess = 'saveSuccess'
}

type AppLang = CoreLanguage.EnglishUS | CoreLanguage.French;

const profileStrings = createCompleteComponentStrings<ProfileStrings, AppLang>({
  [CoreLanguage.EnglishUS]: {
    [ProfileStrings.Header]: 'Profile',
    [ProfileStrings.SaveSuccess]: 'Profile saved'
  },
  [CoreLanguage.French]: {
    [ProfileStrings.Header]: 'Profil',
    [ProfileStrings.SaveSuccess]: 'Profil enregistré'
  }
});

// Any omission (e.g. forgetting SaveSuccess in FR) triggers a TypeScript error immediately.
```

Adopt this after an initial migration to lock in completeness guarantees at compile time.

For production applications requiring complete translations:

```typescript
const strictEngine = new PluginI18nEngine(languages, {
  validation: {
    requireCompleteStrings: true,      // Require all strings for all languages
    allowPartialRegistration: false,   // Reject incomplete registrations
    fallbackLanguageId: 'en'
  }
});

// This will throw RegistryError if any translations are missing
try {
  strictEngine.registerComponent(incompleteRegistration);
} catch (error) {
  if (error instanceof RegistryError) {
    console.error(`Registration failed: ${error.type}`, error.metadata);
  }
}
```

### Validation Helper Functions

```typescript
// Check all components are complete
const validation = i18n.validateAllComponents();
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  console.warn('Warnings:', validation.warnings);
  
  // Get detailed missing translation report
  validation.missingKeys.forEach(missing => {
    console.log(`Missing: ${missing.componentId}.${missing.stringKey} for language ${missing.languageId}`);
  });
}

// Check specific component
const componentValidation = i18n.validateComponent('my-component');
if (!componentValidation.isValid) {
  console.log('Component validation failed:', componentValidation.errors);
}
```

## Benefits After Migration

1. **Better Organization**: Strings are logically grouped by component
2. **Type Safety**: Compile-time validation ensures completeness
3. **Flexible Language Support**: Components can support different language subsets as needed
4. **Comprehensive Validation**: Detailed reporting of missing translations with exact locations
5. **Dynamic Language Addition**: Add new languages at runtime with automatic validation updates
6. **Intelligent Fallback**: Automatic fallback to default language for missing translations
7. **Modular Architecture**: Easy to add new components without affecting existing ones
8. **Core System Strings**: Access to pre-translated system strings in 8 languages
9. **Multi-Instance Support**: Support for different contexts (admin, user, etc.)
10. **Production-Ready Validation**: Strict mode for production environments requiring complete translations

## Migration Checklist

- [ ] Identify current string enums and language enums
- [ ] Group strings into logical components
- [ ] Create ComponentDefinition objects
- [ ] Organize translation objects by component and language
- [ ] Create ComponentRegistration objects
- [ ] Initialize new PluginI18nEngine
- [ ] Register all components
- [ ] Update all translation calls to use component IDs
- [ ] Update language switching code
- [ ] Create helper functions (optional)
- [ ] Test all translations work correctly
- [ ] Validate all components are complete
- [ ] Remove old I18nEngine code

## Testing with the New Architecture

The new plugin-based architecture introduces instance management that requires proper cleanup for test isolation.

### Key Differences in Testing

**Legacy System:**

```typescript
// Old way - simple per-test cleanup
beforeEach(() => {
  I18nEngine.clearInstances(); // Simple static cleanup
});
```

**New Plugin System:**

```typescript
// New way - comprehensive cleanup including component registrations
import { PluginI18nEngine, resetAllI18nEngines } from '@digitaldefiance/i18n-lib';

beforeEach(() => {
  // Clear instances and component registrations
  PluginI18nEngine.clearAllInstances();
});

afterEach(() => {
  // Or use the convenience function
  resetAllI18nEngines();
});
```

### Test Isolation Best Practices

```typescript
describe('My App Tests', () => {
  beforeEach(() => {
    // Essential: Clear all instances before each test
    PluginI18nEngine.clearAllInstances();
  });

  afterEach(() => {
    // Optional: Additional cleanup after each test
    resetAllI18nEngines();
  });

  it('should handle translations correctly', () => {
    // Each test starts with a clean slate
    const i18n = createCoreI18nEngine('test-app');
    // ... test logic
  });
});
```

### Available Cleanup Methods

- `PluginI18nEngine.clearAllInstances()` - Remove all engine instances
- `PluginI18nEngine.removeInstance(key?)` - Remove specific instance
- `PluginI18nEngine.hasInstance(key?)` - Check if instance exists
- `PluginI18nEngine.resetAll()` - Clear instances and component registrations
- `resetAllI18nEngines()` - Convenience function for complete cleanup

### Migration Testing Strategy

1. **Gradual Testing**: Run both systems in parallel during migration
2. **Instance Isolation**: Always clean up between tests
3. **Component Validation**: Test that components register successfully
4. **Translation Verification**: Verify all translations work correctly

```typescript
// Example migration test setup
describe('Migration Tests', () => {
  beforeEach(() => {
    I18nEngine.clearInstances();           // Clean legacy system
    PluginI18nEngine.clearAllInstances();  // Clean new system
  });

  it('should produce same translations in both systems', () => {
    // Set up legacy system
    const legacy = new I18nEngine(legacyConfig);
    
    // Set up new system
    const modern = createCoreI18nEngine('test');
    modern.registerComponent(modernComponent);
    
    // Compare outputs
    const legacyText = legacy.translate(OldStrings.Welcome);
    const modernText = modern.translate('component', NewStrings.Welcome);
    
    expect(modernText).toBe(legacyText);
  });
});
```

## Troubleshooting

### Issue: Missing Translations

**Error**: `String key 'someKey' not found for component 'my-component' in language 'es'`

**Solution**: Check that all string keys are present in all languages:

```typescript
const validation = i18n.validateAllComponents();
validation.missingKeys.forEach(missing => {
  console.log(`Missing: ${missing.componentId}.${missing.stringKey} for ${missing.languageId}`);
});
```

### Issue: Component Not Found

**Error**: `Component 'my-component' not found`

**Solution**: Ensure the component is registered:

```typescript
if (!i18n.hasComponent('my-component')) {
  console.error('Component not registered');
  i18n.registerComponent(myComponentRegistration);
}
```

### Issue: Type Errors

**Error**: TypeScript compilation errors about missing string keys

**Solution**: Ensure your string enums include all keys referenced in translations:

```typescript
// Make sure enum matches component definition
enum MyStrings {
  Key1 = 'key1',
  Key2 = 'key2'
  // All keys must be present
}

const component: ComponentDefinition<MyStrings> = {
  id: 'my-component',
  name: 'My Component',
  stringKeys: Object.values(MyStrings) // This must match the enum
};
```

This migration guide should help you or an AI assistant successfully migrate from the legacy system to the new plugin-based architecture.
