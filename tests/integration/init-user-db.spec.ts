/**
 * @fileoverview Integration test for database initialization lifecycle.
 * Verifies that initializeDevStore creates admin, member, and system users/roles
 * in a real in-memory MongoDB instance via the full Application.start() lifecycle.
 */

import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  CoreLanguageCode,
  GlobalActiveContext,
  IActiveContext,
} from '@digitaldefiance/i18n-lib';
import { createExpressConstants } from '../../src/constants';
import { BaseModelName } from '../../src/enumerations';
import { Environment } from '../../src/environment';
import { ModelRegistry } from '../../src/model-registry';
import { getSchemaMap } from '../../src/schemas';
import { DatabaseInitializationService } from '../../src/services';
import { MongooseDocumentStore } from '../../src/services/mongoose-document-store';
import { MongoApplicationBase } from '../../src/mongo-application-base';
import { IServerInitResult, IConstants } from '../../src/interfaces';
import type { IRoleDocument } from '../../src/documents/role';
import type { IUserDocument } from '../../src/documents/user';

// Use example.com so EmailString validation passes (localhost is rejected)
const TestConstants: IConstants = createExpressConstants(
  'example.com',
  'example.com',
);

// Undo the global argon2 mock from setup.ts — this integration test needs real argon2
jest.unmock('argon2');

/** Generate a 64-char lowercase hex string (32 random bytes). */
const hex64 = () => randomBytes(32).toString('hex');

describe('Database initialization integration (initializeDevStore)', () => {
  let app: MongoApplicationBase<
    Buffer,
    Record<string, never>,
    IServerInitResult<Buffer>
  >;
  let documentStore: MongooseDocumentStore;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env['DEV_DATABASE'] = `init_integration_${Date.now()}`;
    process.env['MONGO_USE_TRANSACTIONS'] = 'false';
    process.env['PORT'] = String(Math.floor(Math.random() * 10000) + 50000);
    process.env.LANGUAGE = 'English (US)';
    if (!process.env['JWT_SECRET']) {
      process.env['JWT_SECRET'] = hex64();
    }
    if (!process.env['MNEMONIC_HMAC_SECRET']) {
      process.env['MNEMONIC_HMAC_SECRET'] = hex64();
    }
    if (!process.env['MNEMONIC_ENCRYPTION_KEY']) {
      process.env['MNEMONIC_ENCRYPTION_KEY'] = hex64();
    }
    if (!process.env['API_DIST_DIR']) {
      const dir = join(tmpdir(), `init-test-api-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      process.env['API_DIST_DIR'] = dir;
    }
    if (!process.env['REACT_DIST_DIR']) {
      const dir = join(tmpdir(), `init-test-react-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      process.env['REACT_DIST_DIR'] = dir;
    }

    const context = GlobalActiveContext.getInstance<
      CoreLanguageCode,
      IActiveContext<CoreLanguageCode>
    >();
    context.setAdminLanguage('en-US');

    const env = new Environment(undefined, true, true, TestConstants);

    documentStore = new MongooseDocumentStore(
      getSchemaMap,
      DatabaseInitializationService.initUserDb.bind(
        DatabaseInitializationService,
      ),
      DatabaseInitializationService.serverInitResultHash.bind(
        DatabaseInitializationService,
      ),
      env,
      TestConstants,
    );

    app = new MongoApplicationBase(env, documentStore, TestConstants);

    // BaseApplication.start() -> setupDevStore -> connect (in-memory MongoDB)
    await app.start();

    // Now run initializeDevStore which calls initUserDb against the real DB
    await documentStore.initializeDevStore<IServerInitResult<Buffer>>(app);
  }, 120000);

  afterAll(async () => {
    if (app) {
      await app.stop();
    }
  }, 30000);

  it('should create the admin user', async () => {
    const UserModel = ModelRegistry.instance.getTypedModel<
      IUserDocument<string, Buffer>
    >(BaseModelName.User);
    const admin = await UserModel.findOne({
      username: TestConstants.AdministratorUser,
    });
    expect(admin).not.toBeNull();
    expect(admin!.email).toBe(TestConstants.AdministratorEmail);
    expect(admin!.publicKey).toBeDefined();
    expect(admin!.publicKey.length).toBeGreaterThan(0);
  });

  it('should create the member user', async () => {
    const UserModel = ModelRegistry.instance.getTypedModel<
      IUserDocument<string, Buffer>
    >(BaseModelName.User);
    const member = await UserModel.findOne({
      username: TestConstants.MemberUser,
    });
    expect(member).not.toBeNull();
    expect(member!.email).toBe(TestConstants.MemberEmail);
    expect(member!.publicKey).toBeDefined();
    expect(member!.publicKey.length).toBeGreaterThan(0);
  });

  it('should create the system user', async () => {
    const UserModel = ModelRegistry.instance.getTypedModel<
      IUserDocument<string, Buffer>
    >(BaseModelName.User);
    const system = await UserModel.findOne({
      username: TestConstants.SystemUser,
    });
    expect(system).not.toBeNull();
    expect(system!.email).toBe(TestConstants.SystemEmail);
    expect(system!.publicKey).toBeDefined();
    expect(system!.publicKey.length).toBeGreaterThan(0);
  });

  it('should create the administrator role', async () => {
    const RoleModel = ModelRegistry.instance.getTypedModel<
      IRoleDocument<Buffer>
    >(BaseModelName.Role);
    const adminRole = await RoleModel.findOne({
      name: TestConstants.AdministratorRole,
    });
    expect(adminRole).not.toBeNull();
    expect(adminRole!.admin).toBe(true);
    expect(adminRole!.member).toBe(true);
  });

  it('should create the member role', async () => {
    const RoleModel = ModelRegistry.instance.getTypedModel<
      IRoleDocument<Buffer>
    >(BaseModelName.Role);
    const memberRole = await RoleModel.findOne({
      name: TestConstants.MemberRole,
    });
    expect(memberRole).not.toBeNull();
    expect(memberRole!.admin).toBe(false);
    expect(memberRole!.member).toBe(true);
  });

  it('should create the system role', async () => {
    const RoleModel = ModelRegistry.instance.getTypedModel<
      IRoleDocument<Buffer>
    >(BaseModelName.Role);
    const systemRole = await RoleModel.findOne({
      name: TestConstants.SystemRole,
    });
    expect(systemRole).not.toBeNull();
    expect(systemRole!.admin).toBe(true);
    expect(systemRole!.system).toBe(true);
  });

  it('should have exactly 3 users and 3 roles', async () => {
    const UserModel = ModelRegistry.instance.getTypedModel<
      IUserDocument<string, Buffer>
    >(BaseModelName.User);
    const RoleModel = ModelRegistry.instance.getTypedModel<
      IRoleDocument<Buffer>
    >(BaseModelName.Role);

    const userCount = await UserModel.countDocuments();
    const roleCount = await RoleModel.countDocuments();

    expect(userCount).toBe(3);
    expect(roleCount).toBe(3);
  });
});
