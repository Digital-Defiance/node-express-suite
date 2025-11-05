# Node Express Suite v2.1 Migration Plan

## Errors to Fix

### 1. Missing Constants
- `GUID_SIZE` missing from IConstants

### 2. Renamed/Removed Exports from i18n-lib
- `PluginTranslatableGenericError` → `TranslatableGenericError`
- `PluginTranslatableHandleableGenericError` → `TranslatableHandleableGenericError`
- `Language` → Removed (use string)
- `Timezone` → Removed (use string)

### 3. Removed Exports from suite-core-lib
- `DefaultLanguageCode` → Removed

### 4. API Changes
- `PluginTypedError` now requires 2 type arguments
- `InvalidEmailError` constructor signature changed
- `engine.translate()` requires componentId as first parameter
- `ECIESService` constructor changed

## Migration Steps

1. Add GUID_SIZE constant
2. Replace PluginTranslatableGenericError with TranslatableGenericError
3. Replace Language/Timezone with string types
4. Remove DefaultLanguageCode usage
5. Fix PluginTypedError type arguments
6. Fix InvalidEmailError calls
7. Fix engine.translate() calls
8. Fix ECIESService instantiation
