import { getSuiteCoreI18nEngine } from '@digitaldefiance/suite-core-lib';
import { withConsoleMocks } from '../__tests__/helpers/console-mocks';

describe('I18n Debug', () => {
  it('should translate using SuiteCoreStringKey alias', () => {
    withConsoleMocks(() => {
      const engine = getSuiteCoreI18nEngine();
      const result = engine.t('{{SuiteCoreStringKey.Admin_DroppingDatabase}}');
      console.log('Result:', result);
      expect(result).not.toContain('{{');
      expect(result).not.toContain('}}');
      expect(result).not.toBe('{{SuiteCoreStringKey.Admin_DroppingDatabase}}');
    });
  });

  it('should translate using suite-core-lib component ID', () => {
    withConsoleMocks(() => {
      const engine = getSuiteCoreI18nEngine();
      const result = engine.t('{{suite-core-lib.Admin_DroppingDatabase}}');
      console.log('Result:', result);
      expect(result).not.toContain('{{');
      expect(result).not.toContain('}}');
    });
  });
});
