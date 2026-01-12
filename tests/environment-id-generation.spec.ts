import { Types } from '@digitaldefiance/mongoose-types';
import { registerNodeRuntimeConfiguration } from '@digitaldefiance/node-ecies-lib';
import { Environment } from '../src/environment';
import { LocalhostConstants } from '../src/constants';

describe('Environment ID Generation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    registerNodeRuntimeConfiguration();
  });

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.NODE_ENV = 'test';
    process.env.HOST = '0.0.0.0';
    process.env.PORT = '3000';
    process.env.JWT_SECRET =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.EMAIL_SENDER = 'test@example.com';
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.SYSTEM_PUBLIC_KEY = 'test-key';
    process.env.MNEMONIC_HMAC_SECRET =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.MNEMONIC_ENCRYPTION_KEY =
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    process.env.API_DIST_DIR = '/tmp/api-dist';
    process.env.REACT_DIST_DIR = '/tmp/react-dist';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should generate valid ObjectIds when not provided', () => {
    delete process.env.ADMIN_ID;
    delete process.env.MEMBER_ID;
    delete process.env.SYSTEM_ID;

    const env = new Environment<Types.ObjectId>(undefined, true);

    expect(Types.ObjectId.isValid(env.adminId)).toBe(true);
    expect(Types.ObjectId.isValid(env.memberId)).toBe(true);
    expect(Types.ObjectId.isValid(env.systemId)).toBe(true);
  });

  it('should deserialize ObjectIds from environment variables', () => {
    const adminId = new Types.ObjectId();
    const memberId = new Types.ObjectId();
    const systemId = new Types.ObjectId();

    process.env.ADMIN_ID = adminId.toString();
    process.env.MEMBER_ID = memberId.toString();
    process.env.SYSTEM_ID = systemId.toString();

    const env = new Environment<Types.ObjectId>(undefined, true);

    expect(env.adminId?.toString()).toBe(adminId.toString());
    expect(env.memberId?.toString()).toBe(memberId.toString());
    expect(env.systemId?.toString()).toBe(systemId.toString());
  });

  it('should handle Buffer IDs', () => {
    const env = new Environment<Buffer>(undefined, true);

    // Environment generates IDs using idProvider
    expect(env.adminId).toBeDefined();
    expect(env.memberId).toBeDefined();
    expect(env.systemId).toBeDefined();
  });

  it('should use idProvider for ID generation', () => {
    const env = new Environment<Types.ObjectId>(
      undefined,
      true,
      true,
      LocalhostConstants,
    );

    // Verify IDs are generated using the configured idProvider
    expect(Types.ObjectId.isValid(env.adminId)).toBe(true);
    expect(env.adminId?.toString()).toMatch(/^[0-9a-f]{24}$/);
  });
});
