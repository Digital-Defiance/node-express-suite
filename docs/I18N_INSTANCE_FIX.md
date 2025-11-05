# I18n Instance Conflict Fix

## Problem
The application was failing to start with error:
```
I18nError: I18n instance 'default' already exists
```

## Root Cause
The static field `defaultI18nTFunc` in `DatabaseInitializationService` was being initialized during module load (class definition time), which called `getSuiteCoreI18nEngine()` before the i18n-lib's core engine was created. This caused both libraries to attempt creating the 'default' instance.

## Solution
Converted the static field to a getter to make it lazy-loaded:

**Before:**
```typescript
protected static defaultI18nTFunc: (...) => string = getSuiteCoreI18nEngine().translate.bind(...);
```

**After:**
```typescript
protected static get defaultI18nTFunc(): (...) => string {
  return getSuiteCoreI18nEngine().translate.bind(getSuiteCoreI18nEngine());
}
```

## Test Updates
Tests that mocked `defaultI18nTFunc` by direct assignment now use `jest.spyOn`:

**Before:**
```typescript
DatabaseInitializationService['defaultI18nTFunc'] = mockFunction;
```

**After:**
```typescript
jest.spyOn(DatabaseInitializationService as any, 'defaultI18nTFunc', 'get')
  .mockReturnValue(mockFunction);
```

## Files Changed
- `src/services/database-initialization.ts` - Converted static field to getter
- `tests/services/database-initialization.spec.ts` - Updated mocking approach

## Architecture Note
Per the i18n architecture, all engines must use the 'default' instance key. This fix ensures proper lazy initialization so multiple libraries can share the same instance key without conflicts.
