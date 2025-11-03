import { Role } from '@digitaldefiance/suite-core-lib';
import { createRoleSchema, RoleSchema } from '../../src/schemas/role';

describe('RoleSchema', () => {
  describe('createRoleSchema', () => {
    it('should create schema with default options', () => {
      const schema = createRoleSchema();
      expect(schema).toBeDefined();
      expect(schema.path('name')).toBeDefined();
      expect(schema.path('admin')).toBeDefined();
      expect(schema.path('member')).toBeDefined();
    });

    it('should create schema with custom role enum', () => {
      const customRoles = ['CustomRole1', 'CustomRole2'];
      const schema = createRoleSchema({ roleEnum: customRoles });
      expect(schema).toBeDefined();
    });

    it('should create schema with custom user model name', () => {
      const schema = createRoleSchema({ userModelName: 'CustomUser' });
      expect(schema).toBeDefined();
    });
  });

  describe('RoleSchema', () => {
    it('should have required fields', () => {
      expect(RoleSchema.path('name')).toBeDefined();
      expect(RoleSchema.path('admin')).toBeDefined();
      expect(RoleSchema.path('member')).toBeDefined();
      expect(RoleSchema.path('child')).toBeDefined();
      expect(RoleSchema.path('system')).toBeDefined();
      expect(RoleSchema.path('createdBy')).toBeDefined();
      expect(RoleSchema.path('updatedBy')).toBeDefined();
    });

    it('should have unique index on name', () => {
      const indexes = RoleSchema.indexes();
      const nameIndex = indexes.find(idx => idx[0].name === 1);
      expect(nameIndex).toBeDefined();
    });
  });
});
