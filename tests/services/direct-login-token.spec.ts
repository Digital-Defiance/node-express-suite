import { Types } from 'mongoose';
import { DirectLoginTokenService } from '../../src/services/direct-login-token';
import { ModelRegistry } from '../../src/model-registry';

describe('DirectLoginTokenService', () => {
  describe('useToken', () => {
    it('should be defined', () => {
      expect(DirectLoginTokenService.useToken).toBeDefined();
    });
  });
});
