/**
 * Global test setup - initializes i18n engine for all tests
 */
import { createCoreI18nEngine } from '@digitaldefiance/i18n-lib';
import { SuiteCoreComponentId, SuiteCoreComponent, SuiteCoreComponentStrings } from '@digitaldefiance/suite-core-lib';

// Initialize core i18n engine
const engine = createCoreI18nEngine();

// Register suite-core component manually
engine.registerComponent({
  component: SuiteCoreComponent,
  strings: SuiteCoreComponentStrings,
});
