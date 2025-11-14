/**
 * Global test setup - initializes i18n engine for all tests
 */
import { createCoreI18nEngine } from '@digitaldefiance/i18n-lib';
import { SuiteCoreComponentId, SuiteCoreComponent, SuiteCoreComponentStrings } from '@digitaldefiance/suite-core-lib';
import { LocalhostConstants } from '../src/constants';

// Mock argon2 for tests (native module that can fail in some environments)
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('$argon2id$v=19$m=65536,t=3,p=4$mockSalt$mockHash'),
  verify: jest.fn().mockResolvedValue(true),
  argon2id: 2,
}));

// Initialize core i18n engine
const engine = createCoreI18nEngine(undefined, { constants: LocalhostConstants });

// Register suite-core component manually
engine.registerComponent({
  component: SuiteCoreComponent,
  strings: SuiteCoreComponentStrings,
});
