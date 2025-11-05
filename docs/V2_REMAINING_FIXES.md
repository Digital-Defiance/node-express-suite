# Remaining V2.1 Migration Fixes

## Errors to Fix

1. **environment.ts** - timezone.value → timezone (3 occurrences)
2. **get-timezone.ts** - Remove Timezone import
3. **authenticate-token.ts** - Remove GlobalActiveContext and Timezone usage
4. **routers/app.ts** - TranslatableGenericError type arguments (2 occurrences)
5. **database-initialization.ts** - defaultI18nTFunc calls need componentId
6. **database-initialization.ts** - timezone.value → timezone (3 occurrences)
7. **user.ts** - Missing siteLanguage in fillUserDefaults
8. **user.ts** - InvalidEmailError call (line 1141)
