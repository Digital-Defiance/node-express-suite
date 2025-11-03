import { BaseApplication } from '../src/application-base';
import { Environment } from '../src/environment';

describe('BaseApplication', () => {
  class TestApplication extends BaseApplication<any, any> {
    constructor(env: Environment) {
      super(
        env,
        () => ({}),
        async () => ({ success: true, data: {} }),
        () => 'hash',
      );
    }
  }

  let app: TestApplication;
  let env: Environment;

  beforeEach(() => {
    const fs = require('fs');
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.MNEMONIC_HMAC_SECRET = 'a'.repeat(64);
    process.env.MNEMONIC_ENCRYPTION_KEY = 'b'.repeat(64);
    process.env.API_DIST_DIR = '/tmp/test-api-dist';
    process.env.REACT_DIST_DIR = '/tmp/test-react-dist';
    if (!fs.existsSync('/tmp/test-api-dist')) fs.mkdirSync('/tmp/test-api-dist', { recursive: true });
    if (!fs.existsSync('/tmp/test-react-dist')) fs.mkdirSync('/tmp/test-react-dist', { recursive: true });
    env = new Environment(undefined, true);
    app = new TestApplication(env);
  });

  describe('constructor', () => {
    it('should create application instance', () => {
      expect(app).toBeDefined();
      expect(app.ready).toBe(false);
    });
  });

  describe('environment', () => {
    it('should return environment', () => {
      expect(app.environment).toBe(env);
    });
  });

  describe('constants', () => {
    it('should have constants', () => {
      expect(app.constants).toBeDefined();
    });
  });

  describe('ready', () => {
    it('should initially be false', () => {
      expect(app.ready).toBe(false);
    });
  });
});
