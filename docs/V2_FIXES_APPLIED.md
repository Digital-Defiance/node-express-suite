# V2.1 Migration Fixes Applied

## 1. Constants
- ✅ Removed GUID_SIZE from IConstants interface

## 2. Import Renames
- ✅ src/controllers/base.ts: PluginTranslatableGenericError → TranslatableGenericError
- ✅ src/controllers/base.ts: Removed DefaultLanguageCode, using 'en-US' directly

## Remaining Fixes Needed

### Import Renames
- [ ] src/errors/express-validation.ts
- [ ] src/routers/app.ts
- [ ] src/services/database-initialization.ts

### Language/Timezone Removals
- [ ] src/documents/user.ts
- [ ] src/environment.ts
- [ ] src/get-timezone.ts
- [ ] src/interfaces/environment.ts
- [ ] src/middlewares/authenticate-token.ts

### API Changes
- [ ] src/errors/symmetric.ts - PluginTypedError type arguments
- [ ] src/services/system-user.ts - ECIESService constructor
- [ ] src/services/user.ts - InvalidEmailError calls
- [ ] src/utils.ts - engine.translate() calls
- [ ] src/schemas/user.ts - DefaultLanguageCode removal
