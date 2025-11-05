/**
 * Tests for index file exports to improve coverage
 */

describe('Index exports', () => {
  it('should export from main index', () => {
    const exports = require('../src/index');
    expect(exports).toBeDefined();
    expect(typeof exports).toBe('object');
  });

  it('should export from builders index', () => {
    const exports = require('../src/builders/index');
    expect(exports).toBeDefined();
    expect(exports.ApplicationBuilder).toBeDefined();
  });

  it('should export from controllers index', () => {
    const exports = require('../src/controllers/index');
    expect(exports).toBeDefined();
    expect(exports.BaseController).toBeDefined();
  });

  it('should export from database index', () => {
    const exports = require('../src/database/index');
    expect(exports).toBeDefined();
  });

  it('should export from decorators index', () => {
    const exports = require('../src/decorators/index');
    expect(exports).toBeDefined();
    expect(exports.Controller).toBeDefined();
  });

  it('should export from middlewares index', () => {
    const exports = require('../src/middlewares/index');
    expect(exports).toBeDefined();
    expect(exports.authenticateCrypto).toBeDefined();
  });

  it('should export from models index', () => {
    const exports = require('../src/models/index');
    expect(exports).toBeDefined();
    expect(exports.RoleModel).toBeDefined();
  });

  it('should export from pipeline index', () => {
    const exports = require('../src/pipeline/index');
    expect(exports).toBeDefined();
    expect(typeof exports).toBe('object');
  });

  it('should export from responses index', () => {
    const exports = require('../src/responses/index');
    expect(exports).toBeDefined();
    expect(exports.ResponseBuilder).toBeDefined();
  });

  it('should export from routers index', () => {
    const exports = require('../src/routers/index');
    expect(exports).toBeDefined();
    expect(exports.BaseRouter).toBeDefined();
  });

  it('should export from routing index', () => {
    const exports = require('../src/routing/index');
    expect(exports).toBeDefined();
  });

  it('should export from schemas index', () => {
    const exports = require('../src/schemas/index');
    expect(exports).toBeDefined();
    expect(exports.RoleSchema).toBeDefined();
  });

  it('should export from services index', () => {
    const exports = require('../src/services/index');
    expect(exports).toBeDefined();
    expect(typeof exports).toBe('object');
  });

  it('should export from types index', () => {
    const exports = require('../src/types/index');
    expect(exports).toBeDefined();
  });

  it('should export from validation index', () => {
    const exports = require('../src/validation/index');
    expect(exports).toBeDefined();
    expect(exports.ValidationBuilder).toBeDefined();
  });

  it('should export from container index', () => {
    const exports = require('../src/container/index');
    expect(exports).toBeDefined();
    expect(exports.ServiceContainer).toBeDefined();
  });

  it('should export from interfaces/api-responses index', () => {
    const exports = require('../src/interfaces/api-responses/index');
    expect(exports).toBeDefined();
  });

  it('should export from interfaces/backend-objects index', () => {
    const exports = require('../src/interfaces/backend-objects/index');
    expect(exports).toBeDefined();
  });

  it('should export from plugins index', () => {
    const exports = require('../src/plugins/index');
    expect(exports).toBeDefined();
    expect(exports.PluginManager).toBeDefined();
  });

  it('should export from registry index', () => {
    const exports = require('../src/registry/index');
    expect(exports).toBeDefined();
    expect(exports.emailServiceRegistry).toBeDefined();
  });

  it('should export from transactions index', () => {
    const exports = require('../src/transactions/index');
    expect(exports).toBeDefined();
    expect(exports.TransactionManager).toBeDefined();
  });
});
