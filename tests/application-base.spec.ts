import '@digitaldefiance/express-suite-test-utils';
import {
  connectMemoryDB,
  disconnectMemoryDB,
  withConsoleMocks,
} from '@digitaldefiance/express-suite-test-utils';
import mongoose from '@digitaldefiance/mongoose-types';
import { TranslatableSuiteError } from '@digitaldefiance/suite-core-lib';
import { MongoApplicationBase } from '../src/mongo-application-base';
import { BaseApplication } from '../src/application-base';
import { Environment } from '../src/environment';
import { IDocumentStore } from '../src/interfaces/document-store';
import { MongooseDocumentStore } from '../src/services/mongoose-document-store';

describe('BaseApplication', () => {
  /**
   * Create a minimal MongooseDocumentStore for testing.
   */
  function createDocumentStore(env: Environment) {
    return new MongooseDocumentStore(
      () => ({}),
      async () => ({ success: true, data: {} }),
      () => 'hash',
      env,
    );
  }

  /**
   * TestApplication wraps MongoApplicationBase with a MongooseDocumentStore.
   */
  class TestApplication extends MongoApplicationBase<any, any, any> {
    constructor(env: Environment, constants?: any) {
      const store = createDocumentStore(env);
      super(env, store, constants);
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
    if (!fs.existsSync('/tmp/test-api-dist'))
      fs.mkdirSync('/tmp/test-api-dist', { recursive: true });
    if (!fs.existsSync('/tmp/test-react-dist'))
      fs.mkdirSync('/tmp/test-react-dist', { recursive: true });
    env = new Environment(undefined, true);
    app = new TestApplication(env);
  });

  afterEach(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('constructor', () => {
    it('should create application instance', () => {
      expect(app).toBeDefined();
      expect(app.ready).toBe(false);
    });

    it('should initialize with custom constants', () => {
      const customConstants = { APP_NAME: 'TestApp' };
      const appWithConstants = new TestApplication(env, customConstants);
      expect(appWithConstants.constants).toBe(customConstants);
    });

    it('should initialize services container', () => {
      expect(app['services']).toBeDefined();
    });

    it('should initialize plugins manager', () => {
      expect(app['plugins']).toBeDefined();
    });
  });

  describe('environment', () => {
    it('should return environment', () => {
      expect(app.environment).toBe(env);
    });
  });

  describe('reloadEnvironment', () => {
    it('should reload environment', () => {
      const originalEnv = app.environment;
      process.env.SYSTEM_PUBLIC_KEY = 'a'.repeat(130); // Set required env var
      app.reloadEnvironment(undefined, true);
      expect(app.environment).not.toBe(originalEnv);
      expect(app.environment).toBeDefined();
      delete process.env.SYSTEM_PUBLIC_KEY;
    });
  });

  describe('distDir', () => {
    it('should return dist directory path', () => {
      const distDir = BaseApplication.distDir;
      expect(distDir).toContain('dist');
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

  describe('validateMongoUri (via MongooseDocumentStore)', () => {
    // validateMongoUri is now internal to MongooseDocumentStore.connect().
    // We test it indirectly by calling connect with invalid URIs.
    it('should reject invalid protocol via connect', async () => {
      const store = createDocumentStore(env);
      await expect(
        store.connect('http://localhost:27017/test'),
      ).rejects.toThrow();
    });

    describe('in production mode', () => {
      let prodEnv: Environment;

      beforeEach(() => {
        process.env.NODE_ENV = 'production';
        process.env.SYSTEM_PUBLIC_KEY = '04' + '00'.repeat(64);
        prodEnv = new Environment(undefined, false);
      });

      afterEach(() => {
        process.env.NODE_ENV = 'test';
        delete process.env.SYSTEM_PUBLIC_KEY;
      });

      it('should reject localhost in production', async () => {
        const store = createDocumentStore(prodEnv);
        await expect(
          store.connect('mongodb://localhost:27017/test'),
        ).rejects.toThrow();
      });

      it('should reject 127.0.0.1 in production', async () => {
        const store = createDocumentStore(prodEnv);
        await expect(
          store.connect('mongodb://127.0.0.1:27017/test'),
        ).rejects.toThrow();
      });

      it('should reject private IP 10.x.x.x in production', async () => {
        const store = createDocumentStore(prodEnv);
        await expect(
          store.connect('mongodb://10.0.0.1:27017/test'),
        ).rejects.toThrow();
      });

      it('should reject private IP 192.168.x.x in production', async () => {
        const store = createDocumentStore(prodEnv);
        await expect(
          store.connect('mongodb://192.168.1.1:27017/test'),
        ).rejects.toThrow();
      });

      it('should reject private IP 172.16-31.x.x in production', async () => {
        const store = createDocumentStore(prodEnv);
        await expect(
          store.connect('mongodb://172.16.0.1:27017/test'),
        ).rejects.toThrow();
        await expect(
          store.connect('mongodb://172.31.255.255:27017/test'),
        ).rejects.toThrow();
      });

      it('should reject link-local IP 169.254.x.x in production', async () => {
        const store = createDocumentStore(prodEnv);
        await expect(
          store.connect('mongodb://169.254.1.1:27017/test'),
        ).rejects.toThrow();
      });

      it('should reject IPv6 localhost in production', async () => {
        const store = createDocumentStore(prodEnv);
        await expect(
          store.connect('mongodb://[::1]:27017/test'),
        ).rejects.toThrow();
      });

      it('should reject IPv6 private addresses in production', async () => {
        const store = createDocumentStore(prodEnv);
        await expect(
          store.connect('mongodb://[fc00::1]:27017/test'),
        ).rejects.toThrow();
        await expect(
          store.connect('mongodb://[fd00::1]:27017/test'),
        ).rejects.toThrow();
      });
    });
  });

  describe('db getter', () => {
    it('should throw error before connection', () => {
      expect(() => app.db).toThrowType(TranslatableSuiteError);
    });
  });

  describe('schemaMap getter', () => {
    it('should throw error when schema map not initialized', () => {
      expect(() => app.schemaMap).toThrow();
    });
  });

  describe('devDatabase getter', () => {
    it('should return undefined if not set', () => {
      expect(app.devDatabase).toBeUndefined();
    });
  });

  describe('services getter', () => {
    it('should return services container', () => {
      expect(app['services']).toBeDefined();
    });
  });

  describe('plugins getter', () => {
    it('should return plugins manager', () => {
      expect(app['plugins']).toBeDefined();
    });
  });

  describe('connect via documentStore', () => {
    beforeEach(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    });

    afterEach(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    });

    it('should connect to MongoDB with valid URI via start()', async () => {
      await withConsoleMocks({ mute: true }, async () => {
        const mockConnect = jest
          .spyOn(mongoose, 'connect')
          .mockResolvedValue(mongoose as ReturnType<typeof mongoose.connect>);

        Object.defineProperty(mongoose.connection, 'readyState', {
          value: 1,
          writable: true,
          configurable: true,
        });
        const mockOnce = jest.fn((event: string, callback: () => void) => {
          if (event === 'connected') callback();
        });
        mongoose.connection.once = mockOnce as typeof mongoose.connection.once;

        (mongoose.connection as Record<string, unknown>).db = {
          admin: () => ({ command: jest.fn().mockResolvedValue({}) }),
        };

        await app.start('mongodb://localhost:27017/test');

        expect(mockConnect).toHaveBeenCalled();
        expect(app.ready).toBe(true);
        mockConnect.mockRestore();
        delete (mongoose.connection as Record<string, unknown>).db;
      });
    }, 30000);

    it('should handle connection errors gracefully', async () => {
      const mockConnect = jest
        .spyOn(mongoose, 'connect')
        .mockRejectedValue(new Error('Connection failed'));

      await expect(app.start('mongodb://localhost:27017/test')).rejects.toThrow(
        'Connection failed',
      );

      mockConnect.mockRestore();
    });
  });

  describe('disconnect via documentStore', () => {
    it('should disconnect from MongoDB via stop()', async () => {
      const mockDisconnect = jest
        .spyOn(mongoose, 'disconnect')
        .mockResolvedValue();

      // Simulate connected state
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 1,
        writable: true,
        configurable: true,
      });

      // Set internal _db so disconnect path is taken
      const store = app.documentStore as MongooseDocumentStore<any, any, any>;
      (store as Record<string, unknown>)['_db'] = mongoose;

      await app.stop();

      expect(mockDisconnect).toHaveBeenCalled();

      mockDisconnect.mockRestore();
    });

    it('should not disconnect if not connected', async () => {
      const mockDisconnect = jest
        .spyOn(mongoose, 'disconnect')
        .mockResolvedValue();

      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 0,
        writable: true,
        configurable: true,
      });

      await app.stop();

      expect(mockDisconnect).not.toHaveBeenCalled();

      mockDisconnect.mockRestore();
    });
  });

  describe('setupDevStore via MongooseDocumentStore', () => {
    it('should create in-memory MongoDB instance', async () => {
      const mockCreate = jest
        .spyOn(require('mongodb-memory-server').MongoMemoryReplSet, 'create')
        .mockResolvedValue({
          waitUntilRunning: jest.fn().mockResolvedValue(undefined),
          getUri: jest.fn().mockReturnValue('mongodb://localhost:27017'),
        });

      const store = createDocumentStore(env);
      const uri = await store.setupDevStore();

      expect(uri).toContain('mongodb://');
      expect(store.devDatabase).toBeDefined();

      mockCreate.mockRestore();
    });

    it('should configure connection pool settings', async () => {
      const mockCreate = jest
        .spyOn(require('mongodb-memory-server').MongoMemoryReplSet, 'create')
        .mockResolvedValue({
          waitUntilRunning: jest.fn().mockResolvedValue(undefined),
          getUri: jest.fn().mockReturnValue('mongodb://localhost:27017/test'),
        });

      const store = createDocumentStore(env);
      const uri = await store.setupDevStore();

      expect(uri).toContain('maxPoolSize=20');
      expect(uri).toContain('minPoolSize=4');

      mockCreate.mockRestore();
    });

    it('should wait for replica set to be ready', async () => {
      const mockWaitUntilRunning = jest.fn().mockResolvedValue(undefined);
      const mockCreate = jest
        .spyOn(require('mongodb-memory-server').MongoMemoryReplSet, 'create')
        .mockResolvedValue({
          waitUntilRunning: mockWaitUntilRunning,
          getUri: jest.fn().mockReturnValue('mongodb://localhost:27017'),
        });

      const store = createDocumentStore(env);
      await store.setupDevStore();

      expect(mockWaitUntilRunning).toHaveBeenCalled();

      mockCreate.mockRestore();
    });
  });

  describe('getModel', () => {
    it('should have getModel method', () => {
      expect(app.getModel).toBeDefined();
      expect(typeof app.getModel).toBe('function');
    });
  });
});
