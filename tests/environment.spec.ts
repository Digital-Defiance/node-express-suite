import { LanguageRegistry } from '@digitaldefiance/i18n-lib';
import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'fs';
import { Types } from '@digitaldefiance/mongoose-types';
import { registerNodeRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';
import { join } from 'path';
import { Environment } from '../src/environment';

const { ObjectId } = Types;

describe('Environment', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalArgv: string[];
  let tempDir: string;
  let tempEnvFile: string;
  let tempApiDistDir: string;
  let tempReactDistDir: string;

  beforeAll(() => {
    // Initialize Node.js runtime configuration
    registerNodeRuntimeConfiguration();
    // Initialize i18n system
    LanguageRegistry['languages'].clear();
    LanguageRegistry.registerLanguage({
      id: 'en',
      code: 'en',
      name: 'English',
      isDefault: true,
    });
    LanguageRegistry.setDefaultLanguage('en');
    // Create temporary directories for testing
    tempDir = join(process.cwd(), 'tmp-test-env');
    tempEnvFile = join(tempDir, '.env.test');
    tempApiDistDir = join(tempDir, 'api-dist');
    tempReactDistDir = join(tempDir, 'react-dist');

    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    if (!existsSync(tempApiDistDir)) {
      mkdirSync(tempApiDistDir, { recursive: true });
    }
    if (!existsSync(tempReactDistDir)) {
      mkdirSync(tempReactDistDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Save original environment and argv
    originalEnv = { ...process.env };
    originalArgv = [...process.argv];

    // Clear environment variables that might interfere with tests
    delete process.env['DEBUG'];
    delete process.env['DETAILED_DEBUG'];
    delete process.env['HOST'];
    delete process.env['PORT'];
    delete process.env['JWT_SECRET'];
    delete process.env['EMAIL_SENDER'];
    delete process.env['BASE_PATH'];
    delete process.env['SERVER_URL'];
    delete process.env['API_DIST_DIR'];
    delete process.env['REACT_DIST_DIR'];
    delete process.env['HTTPS_DEV_CERT_DIR'];
    delete process.env['HTTPS_DEV_PORT'];
    delete process.env['DISABLE_EMAIL_SEND'];
    delete process.env['MONGO_URI'];
    delete process.env['MONGO_SET_PARAMETER_SUPPORTED'];
    delete process.env['MONGO_TRANSACTION_LIFETIME_LIMIT_SECONDS_SUPPORTED'];
    delete process.env[
      'MONGO_MAX_TRANSACTION_LOCK_REQUEST_TIMEOUT_MILLIS_SUPPORTED'
    ];
    delete process.env['MONGO_MAX_POOL_SIZE'];
    delete process.env['MONGO_MIN_POOL_SIZE'];
    delete process.env['MONGO_MAX_IDLE_TIME_MS'];
    delete process.env['MONGO_SERVER_SELECTION_TIMEOUT_MS'];
    delete process.env['MONGO_SOCKET_TIMEOUT_MS'];
    delete process.env['MONGO_RETRY_WRITES'];
    delete process.env['MONGO_RETRY_READS'];
    delete process.env['MONGO_TRANSACTION_TIMEOUT'];
    delete process.env['MONGO_TRANSACTION_LOCK_REQUEST_TIMEOUT'];
    delete process.env['MONGO_USE_TRANSACTIONS'];
    delete process.env['ADMIN_MNEMONIC'];
    delete process.env['ADMIN_CREATED_AT'];
    delete process.env['ADMIN_ID'];
    delete process.env['ADMIN_PASSWORD'];
    delete process.env['ADMIN_ROLE_ID'];
    delete process.env['ADMIN_BACKUP_CODES'];
    delete process.env['MEMBER_MNEMONIC'];
    delete process.env['MEMBER_CREATED_AT'];
    delete process.env['MEMBER_ID'];
    delete process.env['MEMBER_PASSWORD'];
    delete process.env['MEMBER_ROLE_ID'];
    delete process.env['MEMBER_USER_ROLE_ID'];
    delete process.env['MEMBER_BACKUP_CODES'];
    delete process.env['SYSTEM_MNEMONIC'];
    delete process.env['SYSTEM_CREATED_AT'];
    delete process.env['SYSTEM_ID'];
    delete process.env['SYSTEM_PUBLIC_KEY'];
    delete process.env['SYSTEM_PASSWORD'];
    delete process.env['SYSTEM_ROLE_ID'];
    delete process.env['SYSTEM_BACKUP_CODES'];
    delete process.env['MNEMONIC_HMAC_SECRET'];
    delete process.env['MNEMONIC_ENCRYPTION_KEY'];
    delete process.env['PBKDF2_ITERATIONS'];
    delete process.env['DEV_DATABASE'];

    // Set NODE_ENV to test to avoid AWS validation
    process.env['NODE_ENV'] = 'test';

    // Set required minimal environment for testing
    process.env['HOST'] = '0.0.0.0';
    process.env['PORT'] = '3000';
    // test fixture - not a real credential
    // amazonq-ignore-next-line
    process.env['JWT_SECRET'] =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env['EMAIL_SENDER'] = 'test@example.com';
    process.env['MONGO_URI'] = 'mongodb://localhost:27017/test';
    process.env['API_DIST_DIR'] = tempApiDistDir;
    process.env['REACT_DIST_DIR'] = tempReactDistDir;
    process.env['SYSTEM_PUBLIC_KEY'] = 'test-public-key';
    process.env['MNEMONIC_HMAC_SECRET'] =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env['MNEMONIC_ENCRYPTION_KEY'] =
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
  });

  afterEach(() => {
    // Restore original environment and argv
    process.env = { ...originalEnv };
    process.argv = [...originalArgv];

    // Clean up test files
    if (existsSync(tempEnvFile)) {
      unlinkSync(tempEnvFile);
    }
  });

  afterAll(() => {
    // Clean up temporary directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create environment with default values', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const env = new Environment();
      consoleErrorSpy.mockRestore();

      expect(env.debug).toBe(false);
      expect(env.detailedDebug).toBe(false);
      expect(env.host).toBe('0.0.0.0');
      expect(env.port).toBe(3000);
      expect(env.jwtSecret).toBe(
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      );
      expect(env.emailSender).toBe('test@example.com');
      expect(env.basePath).toBe('/');
      expect(env.disableEmailSend).toBe(false);
      expect(env.devDatabase).toBeUndefined();
      expect(env.httpsDevPort).toBe(443);
      expect(env.httpsDevCertRoot).toBeUndefined();
    });

    it('should load debug flags correctly', () => {
      process.env['DEBUG'] = 'true';
      process.env['DETAILED_DEBUG'] = '1';

      const env = new Environment();

      expect(env.debug).toBe(true);
      expect(env.detailedDebug).toBe(true);
    });

    it('should parse numeric environment variables correctly', () => {
      process.env['PORT'] = '8080';
      process.env['HTTPS_DEV_PORT'] = '8443';
      process.env['MONGO_MAX_POOL_SIZE'] = '20';
      process.env['MONGO_MIN_POOL_SIZE'] = '5';
      process.env['MONGO_MAX_IDLE_TIME_MS'] = '60000';
      process.env['MONGO_SERVER_SELECTION_TIMEOUT_MS'] = '10000';
      process.env['MONGO_SOCKET_TIMEOUT_MS'] = '90000';
      process.env['MONGO_TRANSACTION_TIMEOUT'] = '30000';
      process.env['MONGO_TRANSACTION_LOCK_REQUEST_TIMEOUT'] = '5000';
      process.env['PBKDF2_ITERATIONS'] = '200000';

      const env = new Environment();

      expect(env.port).toBe(8080);
      expect(env.httpsDevPort).toBe(8443);
      expect(env.mongo.maxPoolSize).toBe(20);
      expect(env.mongo.minPoolSize).toBe(5);
      expect(env.mongo.maxIdleTimeMS).toBe(60000);
      expect(env.mongo.serverSelectionTimeoutMS).toBe(10000);
      expect(env.mongo.socketTimeoutMS).toBe(90000);
      expect(env.mongo.transactionTimeout).toBe(30000);
      expect(env.mongo.transactionLockRequestTimeout).toBe(5000);
      expect(env.pbkdf2Iterations).toBe(200000);
    });

    it('should parse boolean environment variables correctly', () => {
      process.env['DEBUG'] = 'true';
      process.env['DETAILED_DEBUG'] = '1';
      process.env['DEV_DATABASE'] = 'test-dev-db';
      process.env['DISABLE_EMAIL_SEND'] = '1';
      process.env['MONGO_SET_PARAMETER_SUPPORTED'] = 'true';
      process.env['MONGO_TRANSACTION_LIFETIME_LIMIT_SECONDS_SUPPORTED'] = '1';
      process.env[
        'MONGO_MAX_TRANSACTION_LOCK_REQUEST_TIMEOUT_MILLIS_SUPPORTED'
      ] = 'true';
      process.env['MONGO_USE_TRANSACTIONS'] = '1';
      process.env['MONGO_RETRY_WRITES'] = 'false';
      process.env['MONGO_RETRY_READS'] = '0';

      const env = new Environment();

      expect(env.debug).toBe(true);
      expect(env.detailedDebug).toBe(true);
      expect(env.devDatabase).toBe('test-dev-db');
      expect(env.disableEmailSend).toBe(true);
      expect(env.mongo.setParameterSupported).toBe(true);
      expect(env.mongo.transactionLifetimeLimitSecondsSupported).toBe(true);
      expect(env.mongo.maxTransactionLockRequestTimeoutMillisSupported).toBe(
        true,
      );
      expect(env.mongo.useTransactions).toBe(true);
      expect(env.mongo.retryWrites).toBe(false);
      expect(env.mongo.retryReads).toBe(false);
    });

    it('should parse ObjectId environment variables correctly', () => {
      const adminId = new ObjectId();
      const memberId = new ObjectId();
      const systemId = new ObjectId();
      const adminRoleId = new ObjectId();
      const memberRoleId = new ObjectId();
      const systemRoleId = new ObjectId();

      process.env['ADMIN_ID'] = adminId.toString();
      process.env['MEMBER_ID'] = memberId.toString();
      process.env['SYSTEM_ID'] = systemId.toString();
      process.env['ADMIN_ROLE_ID'] = adminRoleId.toString();
      process.env['MEMBER_ROLE_ID'] = memberRoleId.toString();
      process.env['SYSTEM_ROLE_ID'] = systemRoleId.toString();

      const env = new Environment(undefined, false, true, undefined);

      expect(env.adminId?.toString()).toBe(adminId.toString());
      expect(env.memberId?.toString()).toBe(memberId.toString());
      expect(env.systemId?.toString()).toBe(systemId.toString());
      expect(env.adminRoleId?.toString()).toBe(adminRoleId.toString());
      expect(env.memberRoleId?.toString()).toBe(memberRoleId.toString());
      expect(env.systemRoleId?.toString()).toBe(systemRoleId.toString());
    });

    it('should parse Date environment variables correctly', () => {
      const adminDate = new Date('2023-01-01T00:00:00.000Z');
      const memberDate = new Date('2023-02-01T00:00:00.000Z');
      const systemDate = new Date('2023-03-01T00:00:00.000Z');

      process.env['ADMIN_CREATED_AT'] = adminDate.toISOString();
      process.env['MEMBER_CREATED_AT'] = memberDate.toISOString();
      process.env['SYSTEM_CREATED_AT'] = systemDate.toISOString();

      const env = new Environment();

      expect(env.adminCreatedAt?.toISOString()).toBe(adminDate.toISOString());
      expect(env.memberCreatedAt?.toISOString()).toBe(memberDate.toISOString());
      expect(env.systemCreatedAt?.toISOString()).toBe(systemDate.toISOString());
    });

    it('should handle SecureString environment variables correctly', () => {
      process.env['ADMIN_MNEMONIC'] =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env['MEMBER_MNEMONIC'] =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env['SYSTEM_MNEMONIC'] =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      process.env['ADMIN_PASSWORD'] = 'admin-password';
      process.env['MEMBER_PASSWORD'] = 'member-password';
      process.env['SYSTEM_PASSWORD'] = 'system-password';

      const env = new Environment();

      expect(env.adminMnemonic?.value).toBe(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      );
      expect(env.memberMnemonic?.value).toBe(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      );
      expect(env.systemMnemonic?.value).toBe(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      );
      expect(env.adminPassword?.value).toBe('admin-password');
      expect(env.memberPassword?.value).toBe('member-password');
      expect(env.systemPassword?.value).toBe('system-password');
    });

    it('should handle SecureBuffer environment variables correctly', () => {
      // test fixture values - not real credentials
      // amazonq-ignore-next-line
      const hmacSecret =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      // test fixture values - not real credentials
      // amazonq-ignore-next-line
      const encryptionKey =
        'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

      process.env['MNEMONIC_HMAC_SECRET'] = hmacSecret;
      process.env['MNEMONIC_ENCRYPTION_KEY'] = encryptionKey;

      const env = new Environment();

      expect(env.mnemonicHmacSecret.valueAsHexString).toBe(hmacSecret);
      expect(env.mnemonicEncryptionKey.valueAsHexString).toBe(encryptionKey);
      expect(env.mnemonicHmacSecret.length).toBe(32);
      expect(env.mnemonicEncryptionKey.length).toBe(32);
    });

    it('should set serverUrl correctly for production', () => {
      process.env['NODE_ENV'] = 'production';

      const env = new Environment();

      expect(env.serverUrl).toBe('https://localhost');
    });

    it('should set serverUrl correctly for development with HTTPS cert', () => {
      // Create mock PEM files for the HTTPS cert test
      const certDir = join(tempDir, 'certs');
      if (!existsSync(certDir)) {
        mkdirSync(certDir, { recursive: true });
      }
      writeFileSync(join(certDir, 'localhost+2.pem'), 'mock cert');
      writeFileSync(join(certDir, 'localhost+2-key.pem'), 'mock key');

      process.env['NODE_ENV'] = 'development';
      process.env['HTTPS_DEV_CERT_DIR'] = certDir;
      process.env['HTTPS_DEV_PORT'] = '3443';

      const env = new Environment();

      expect(env.serverUrl).toBe('https://localhost:3443');
    });

    it('should set serverUrl correctly for development without HTTPS cert', () => {
      process.env['NODE_ENV'] = 'development';
      delete process.env['HTTPS_DEV_CERT_DIR'];

      const env = new Environment();

      expect(env.serverUrl).toBe('http://localhost:3000');
    });
  });

  describe('constructor with .env file loading', () => {
    it('should load environment variables from existing .env file', () => {
      const envContent = `DEBUG=true
DETAILED_DEBUG=1
HOST=custom-host
PORT=9000
JWT_SECRET=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789
EMAIL_SENDER=file@example.com
MONGO_URI=mongodb://file-host:27017/file-db
`;
      writeFileSync(tempEnvFile, envContent);

      const env = new Environment(tempEnvFile);

      expect(env.debug).toBe(true);
      expect(env.detailedDebug).toBe(true);
      expect(env.host).toBe('custom-host');
      expect(env.port).toBe(9000);
      expect(env.jwtSecret).toBe(
        'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      );
      expect(env.emailSender).toBe('file@example.com');
      expect(env.mongo.uri).toBe('mongodb://file-host:27017/file-db');
    });

    it('should override existing environment variables when override=true', () => {
      process.env['HOST'] = 'original-host';
      process.env['PORT'] = '8000';

      const envContent = `HOST=file-host
PORT=9000
`;
      writeFileSync(tempEnvFile, envContent);

      const env = new Environment(tempEnvFile, false, true);

      expect(env.host).toBe('file-host');
      expect(env.port).toBe(9000);
    });

    it('should not override existing environment variables when override=false', () => {
      process.env['HOST'] = 'original-host';
      process.env['PORT'] = '8000';

      const envContent = `HOST=file-host
PORT=9000
`;
      writeFileSync(tempEnvFile, envContent);

      const env = new Environment(tempEnvFile, false, false);

      expect(env.host).toBe('original-host');
      expect(env.port).toBe(8000);
    });

    it('should handle non-existent .env file gracefully', () => {
      const nonExistentFile = join(tempDir, 'non-existent.env');

      expect(() => {
        new Environment(nonExistentFile);
      }).not.toThrow();
    });

    it('should handle .env file that cannot be parsed gracefully', () => {
      // Create a file that would cause parsing issues but not crash the dotenv library
      // In reality, dotenv is quite permissive and handles most malformed content
      const invalidContent = `# This is a comment\nDEBUG=true\n\n# Another comment`;
      writeFileSync(tempEnvFile, invalidContent);

      expect(() => {
        new Environment(tempEnvFile);
      }).not.toThrow();
    });
  });

  describe('validation', () => {
    it('should throw error for missing HOST', () => {
      delete process.env['HOST'];
      // Need to clear this since we're in test mode and it has a default
      process.env['HOST'] = '';

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should throw error for missing PORT', () => {
      delete process.env['PORT'];
      // Need to check for falsy value
      process.env['PORT'] = '0';

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should throw error for missing JWT_SECRET', () => {
      delete process.env['JWT_SECRET'];
      process.env['JWT_SECRET'] = '';

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should throw error for missing EMAIL_SENDER', () => {
      delete process.env['EMAIL_SENDER'];
      process.env['EMAIL_SENDER'] = '';

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should throw error for missing MONGO_URI', () => {
      delete process.env['MONGO_URI'];
      process.env['MONGO_URI'] = '';

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should throw error for missing SYSTEM_PUBLIC_KEY when not in initialization mode', () => {
      delete process.env['SYSTEM_PUBLIC_KEY'];

      expect(() => {
        new Environment(undefined, false);
      }).toThrow();
    });

    it('should not throw error for missing SYSTEM_PUBLIC_KEY when in initialization mode', () => {
      delete process.env['SYSTEM_PUBLIC_KEY'];

      expect(() => {
        new Environment(undefined, true);
      }).not.toThrow();
    });

    it('should throw error for invalid MNEMONIC_HMAC_SECRET length', () => {
      process.env['MNEMONIC_HMAC_SECRET'] = '0123456789abcdef'; // Too short

      expect(() => {
        new Environment();
      }).toThrow('MNEMONIC_HMAC_SECRET must match the required format');
    });

    it('should throw error for invalid MNEMONIC_ENCRYPTION_KEY length', () => {
      process.env['MNEMONIC_ENCRYPTION_KEY'] = '0123456789abcdef'; // Too short

      expect(() => {
        new Environment();
      }).toThrow('MNEMONIC_ENCRYPTION_KEY must match the required format');
    });

    it('should throw error for invalid ADMIN_MNEMONIC', () => {
      process.env['ADMIN_MNEMONIC'] = 'invalid mnemonic phrase';

      expect(() => {
        new Environment();
      }).toThrow('ADMIN_MNEMONIC must be a valid mnemonic phrase');
    });

    it('should throw error for invalid MEMBER_MNEMONIC', () => {
      process.env['MEMBER_MNEMONIC'] = 'invalid mnemonic phrase';

      expect(() => {
        new Environment();
      }).toThrow('MEMBER_MNEMONIC must be a valid mnemonic phrase');
    });

    it('should throw error for missing API_DIST_DIR', () => {
      delete process.env['API_DIST_DIR'];

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should throw error for empty API_DIST_DIR', () => {
      process.env['API_DIST_DIR'] = '';

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should throw error for whitespace-only API_DIST_DIR', () => {
      process.env['API_DIST_DIR'] = '   ';

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should throw error for non-existent API_DIST_DIR', () => {
      process.env['API_DIST_DIR'] = '/non/existent/path';

      expect(() => {
        new Environment();
      }).toThrow('API_DIST_DIR');
    });

    it('should throw error for missing REACT_DIST_DIR', () => {
      delete process.env['REACT_DIST_DIR'];

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should throw error for empty REACT_DIST_DIR', () => {
      process.env['REACT_DIST_DIR'] = '';

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should throw error for whitespace-only REACT_DIST_DIR', () => {
      process.env['REACT_DIST_DIR'] = '   ';

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should throw error for non-existent REACT_DIST_DIR', () => {
      process.env['REACT_DIST_DIR'] = '/non/existent/path';

      expect(() => {
        new Environment();
      }).toThrow('REACT_DIST_DIR');
    });

    it('should throw error for invalid PBKDF2_ITERATIONS', () => {
      process.env['PBKDF2_ITERATIONS'] = '0';

      expect(() => {
        new Environment();
      }).toThrow('PBKDF2_ITERATIONS must be greater than 0');
    });

    it('should throw error for JWT_SECRET not matching regex', () => {
      process.env['JWT_SECRET'] = 'too-short';

      expect(() => {
        new Environment();
      }).toThrow('JWT_SECRET must match the required format');
    });

    it('should throw error for MNEMONIC_HMAC_SECRET not matching regex', () => {
      process.env['MNEMONIC_HMAC_SECRET'] = 'invalid-hmac-secret';

      expect(() => {
        new Environment();
      }).toThrow('MNEMONIC_HMAC_SECRET must match the required format');
    });

    it('should throw error for MNEMONIC_ENCRYPTION_KEY not matching regex', () => {
      process.env['MNEMONIC_ENCRYPTION_KEY'] = 'invalid-encryption-key';

      expect(() => {
        new Environment();
      }).toThrow('MNEMONIC_ENCRYPTION_KEY must match the required format');
    });

    it('should accept valid JWT_SECRET matching regex', () => {
      // test fixture - not a real credential
      // amazonq-ignore-next-line
      process.env['JWT_SECRET'] =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      expect(() => {
        new Environment();
      }).not.toThrow();
    });

    it('should accept valid MNEMONIC_HMAC_SECRET matching regex', () => {
      // test fixture - not a real credential
      // amazonq-ignore-next-line
      process.env['MNEMONIC_HMAC_SECRET'] =
        'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789';

      expect(() => {
        new Environment();
      }).not.toThrow();
    });

    it('should accept valid MNEMONIC_ENCRYPTION_KEY matching regex', () => {
      // test fixture - not a real credential
      // amazonq-ignore-next-line
      process.env['MNEMONIC_ENCRYPTION_KEY'] =
        'fedcba9876543210FEDCBA9876543210fedcba9876543210FEDCBA9876543210';

      expect(() => {
        new Environment();
      }).not.toThrow();
    });
  });

  describe('getter methods', () => {
    let env: Environment;

    beforeEach(() => {
      // Set up comprehensive environment
      process.env['DEBUG'] = 'true';
      process.env['DETAILED_DEBUG'] = '1';
      process.env['DEV_DATABASE'] = 'test-dev-database';
      process.env['HOST'] = 'test-host';
      process.env['PORT'] = '8080';
      // test credential - not a real credential
      // amazonq-ignore-next-line
      process.env['JWT_SECRET'] =
        'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
      process.env['EMAIL_SENDER'] = 'test@example.com';
      process.env['BASE_PATH'] = '/api';
      process.env['HTTPS_DEV_PORT'] = '8443';
      process.env['DISABLE_EMAIL_SEND'] = '1';
      process.env['MONGO_URI'] = 'mongodb://test:27017/testdb';
      process.env['MONGO_USE_TRANSACTIONS'] = '1';
      process.env['SYSTEM_PUBLIC_KEY'] = 'test-public-key';
      process.env['PBKDF2_ITERATIONS'] = '150000';

      const adminId = new ObjectId();
      const memberId = new ObjectId();
      const systemId = new ObjectId();

      process.env['ADMIN_ID'] = adminId.toString();
      process.env['MEMBER_ID'] = memberId.toString();
      process.env['SYSTEM_ID'] = systemId.toString();
      process.env['ADMIN_CREATED_AT'] = '2023-01-01T00:00:00.000Z';
      process.env['MEMBER_CREATED_AT'] = '2023-02-01T00:00:00.000Z';
      process.env['SYSTEM_CREATED_AT'] = '2023-03-01T00:00:00.000Z';

      env = new Environment();
    });

    it('should return correct debug flags', () => {
      expect(env.debug).toBe(true);
      expect(env.detailedDebug).toBe(true);
      expect(env.devDatabase).toBe('test-dev-database');
    });

    it('should return correct server configuration', () => {
      expect(env.host).toBe('test-host');
      expect(env.port).toBe(8080);
      expect(env.jwtSecret).toBe(
        'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
      );
      expect(env.emailSender).toBe('test@example.com');
      expect(env.basePath).toBe('/api');
      expect(env.httpsDevPort).toBe(8443);
      expect(env.disableEmailSend).toBe(true);
    });

    it('should return correct directory paths', () => {
      expect(env.apiDistDir).toBe(tempApiDistDir);
      expect(env.reactDistDir).toBe(tempReactDistDir);
    });

    it('should return correct MongoDB configuration', () => {
      expect(env.mongo.uri).toBe('mongodb://test:27017/testdb');
      expect(env.mongo.useTransactions).toBe(true);
      expect(env.mongo.readConcern).toEqual({ level: 'majority' });
      expect(env.mongo.writeConcern).toEqual({ w: 'majority', j: true });
    });

    it('should return correct user IDs and dates', () => {
      expect(ObjectId.isValid(env.adminId)).toBe(true);
      expect(ObjectId.isValid(env.memberId)).toBe(true);
      expect(ObjectId.isValid(env.systemId)).toBe(true);
      expect(env.adminCreatedAt).toEqual(new Date('2023-01-01T00:00:00.000Z'));
      expect(env.memberCreatedAt).toEqual(new Date('2023-02-01T00:00:00.000Z'));
      expect(env.systemCreatedAt).toEqual(new Date('2023-03-01T00:00:00.000Z'));
    });

    it('should return correct system configuration', () => {
      expect(env.systemPublicKeyHex).toBe('test-public-key');
      expect(env.pbkdf2Iterations).toBe(150000);
    });

    it('should return correct secure buffer configurations', () => {
      expect(env.mnemonicHmacSecret).toBeDefined();
      expect(env.mnemonicEncryptionKey).toBeDefined();
      expect(env.mnemonicHmacSecret.length).toBe(32);
      expect(env.mnemonicEncryptionKey.length).toBe(32);
    });

    it('should return correct timezone and language', () => {
      expect(typeof env.timezone).toBe('string');
      expect(env.adminLanguage).toBeDefined();
    });
  });

  describe('utility methods', () => {
    let env: Environment;

    beforeEach(() => {
      env = new Environment();
    });

    describe('has()', () => {
      it('should return true for existing environment variable', () => {
        process.env['TEST_VAR'] = 'test-value';
        env = new Environment();

        expect(env.has('TEST_VAR')).toBe(true);
      });

      it('should return false for non-existing environment variable', () => {
        expect(env.has('NON_EXISTENT_VAR')).toBe(false);
      });
    });

    describe('get()', () => {
      it('should return value for existing environment variable', () => {
        process.env['TEST_VAR'] = 'test-value';
        env = new Environment();

        expect(env.get('TEST_VAR')).toBe('test-value');
      });

      it('should return undefined for non-existing environment variable', () => {
        expect(env.get('NON_EXISTENT_VAR')).toBeUndefined();
      });

      it('should convert values to string', () => {
        process.env['NUMERIC_VAR'] = '123';
        env = new Environment();

        expect(env.get('NUMERIC_VAR')).toBe('123');
        expect(typeof env.get('NUMERIC_VAR')).toBe('string');
      });
    });

    describe('setEnvironment()', () => {
      it('should set simple environment values', () => {
        env.setEnvironment('host', 'new-host');
        expect(env.host).toBe('new-host');
      });

      it('should set nested environment values', () => {
        env.setEnvironment('mongo.uri', 'mongodb://new-host:27017/newdb');
        expect(env.mongo.uri).toBe('mongodb://new-host:27017/newdb');
      });

      it('should set deeply nested environment values', () => {
        env.setEnvironment('mongo.readConcern.level', 'local');
        expect((env.mongo.readConcern as any).level).toBe('local');
      });
    });

    describe('getObject()', () => {
      it('should return the original environment object', () => {
        process.env['TEST_VAR'] = 'test-value';
        env = new Environment();

        const envObj = env.getObject();

        expect(envObj).toHaveProperty('TEST_VAR', 'test-value');
        expect(envObj).toHaveProperty('HOST', '0.0.0.0');
        expect(envObj).toHaveProperty('PORT', '3000');
      });
    });

    describe('dumpEnvironment()', () => {
      it('should dump environment without throwing', () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

        expect(() => {
          env.dumpEnvironment();
        }).not.toThrow();

        consoleLogSpy.mockRestore();
      });

      it('should call debugLog with correct parameters', () => {
        // Mock console.warn to capture the call
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        env.dumpEnvironment('warn');

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Environment Variables:'),
        );

        consoleSpy.mockRestore();
      });
    });
  });

  describe('backup codes parsing', () => {
    it('should parse admin backup codes correctly', () => {
      process.env['ADMIN_BACKUP_CODES'] =
        '1234567890abcdef1234567890abcdef,fedcba0987654321fedcba0987654321,abcdef1234567890abcdef1234567890';

      const env = new Environment();

      expect(env.adminBackupCodes).toBeDefined();
      expect(env.adminBackupCodes).toHaveLength(3);
    });

    it('should parse member backup codes correctly', () => {
      process.env['MEMBER_BACKUP_CODES'] =
        '11111111111111111111111111111111,22222222222222222222222222222222';

      const env = new Environment();

      expect(env.memberBackupCodes).toBeDefined();
      expect(env.memberBackupCodes).toHaveLength(2);
    });

    it('should parse system backup codes correctly', () => {
      process.env['SYSTEM_BACKUP_CODES'] =
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,cccccccccccccccccccccccccccccccc,dddddddddddddddddddddddddddddddd';

      const env = new Environment();

      expect(env.systemBackupCodes).toBeDefined();
      expect(env.systemBackupCodes).toHaveLength(4);
    });

    it('should handle undefined backup codes', () => {
      const env = new Environment();

      expect(env.adminBackupCodes).toBeUndefined();
      expect(env.memberBackupCodes).toBeUndefined();
      expect(env.systemBackupCodes).toBeUndefined();
    });
  });

  describe('default values and fallbacks', () => {
    it('should use default values when environment variables are not set', () => {
      // Clear optional environment variables
      delete process.env['DEBUG'];
      delete process.env['DETAILED_DEBUG'];
      delete process.env['DEV_DATABASE'];
      delete process.env['BASE_PATH'];
      delete process.env['DISABLE_EMAIL_SEND'];
      delete process.env['HTTPS_DEV_CERT_DIR'];
      delete process.env['HTTPS_DEV_PORT'];

      const env = new Environment();

      expect(env.debug).toBe(false);
      expect(env.detailedDebug).toBe(false);
      expect(env.devDatabase).toBeUndefined();
      expect(env.basePath).toBe('/');
      expect(env.disableEmailSend).toBe(false);
      expect(env.httpsDevCertRoot).toBeUndefined();
      expect(env.httpsDevPort).toBe(443);
    });

    it('should use default MongoDB configuration values', () => {
      const env = new Environment();

      expect(env.mongo.maxPoolSize).toBe(10);
      expect(env.mongo.minPoolSize).toBe(2);
      expect(env.mongo.maxIdleTimeMS).toBe(30000);
      expect(env.mongo.serverSelectionTimeoutMS).toBe(5000);
      expect(env.mongo.socketTimeoutMS).toBe(45000);
      expect(env.mongo.retryWrites).toBe(true);
      expect(env.mongo.retryReads).toBe(true);
      expect(env.mongo.readConcern).toEqual({ level: 'majority' });
      expect(env.mongo.writeConcern).toEqual({ w: 'majority', j: true });
    });

    it('should generate default ObjectIds when not provided', () => {
      delete process.env['ADMIN_ID'];
      delete process.env['MEMBER_ID'];
      delete process.env['SYSTEM_ID'];

      const env = new Environment();

      expect(ObjectId.isValid(env.adminId)).toBe(true);
      expect(ObjectId.isValid(env.memberId)).toBe(true);
      expect(ObjectId.isValid(env.systemId)).toBe(true);
    });

    it('should generate default dates when not provided', () => {
      delete process.env['ADMIN_CREATED_AT'];
      delete process.env['MEMBER_CREATED_AT'];
      delete process.env['SYSTEM_CREATED_AT'];

      const env = new Environment();

      expect(env.adminCreatedAt).toBeInstanceOf(Date);
      expect(env.memberCreatedAt).toBeInstanceOf(Date);
      expect(env.systemCreatedAt).toBeInstanceOf(Date);
    });

    it('should use default PBKDF2 iterations', () => {
      delete process.env['PBKDF2_ITERATIONS'];

      const env = new Environment();

      expect(env.pbkdf2Iterations).toBe(100000);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed ObjectId strings gracefully', () => {
      process.env['ADMIN_ID'] = 'invalid-object-id';

      expect(() => {
        new Environment();
      }).toThrow(); // ObjectId constructor should throw
    });

    it('should handle malformed date strings gracefully', () => {
      process.env['ADMIN_CREATED_AT'] = 'invalid-date';

      expect(() => {
        new Environment();
      }).not.toThrow(); // Date constructor should handle invalid dates
    });

    it('should handle invalid numeric strings', () => {
      // Test that NaN values are properly handled
      // Note: The Environment class validates that port is truthy, so NaN will fail validation
      process.env['PORT'] = 'not-a-number';

      expect(() => {
        new Environment();
      }).toThrow();
    });

    it('should handle very large numeric values', () => {
      process.env['PORT'] = '999999999';
      process.env['PBKDF2_ITERATIONS'] = '999999999';

      const env = new Environment();

      expect(env.port).toBe(999999999);
      expect(env.pbkdf2Iterations).toBe(999999999);
    });
  });
});
