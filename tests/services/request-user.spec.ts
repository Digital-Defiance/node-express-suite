import { Types } from 'mongoose';
import { RequestUserService } from '../../src/services/request-user';
import { Role } from '@digitaldefiance/suite-core-lib';

describe('RequestUserService', () => {
  describe('makeRequestUserDTO', () => {
    it('should create DTO from user document', () => {
      const userDoc = {
        _id: new Types.ObjectId(),
        email: 'test@example.com',
        username: 'testuser',
        timezone: 'UTC',
        emailVerified: true,
        darkMode: false,
        siteLanguage: 'en',
      } as any;

      const roles = [
        {
          _id: new Types.ObjectId(),
          name: Role.Member,
          createdAt: new Date(),
          createdBy: new Types.ObjectId(),
          updatedAt: new Date(),
          updatedBy: new Types.ObjectId(),
        },
      ] as any;

      const result = RequestUserService.makeRequestUserDTO(userDoc, roles);
      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('testuser');
      expect(result.roles).toHaveLength(1);
    });

    it('should throw if user document missing _id', () => {
      const userDoc = { email: 'test@example.com' } as any;
      expect(() => RequestUserService.makeRequestUserDTO(userDoc, [])).toThrow();
    });
  });

  describe('hydrateRequestUser', () => {
    it('should hydrate DTO to backend object', () => {
      const dto = {
        id: new Types.ObjectId().toString(),
        email: 'test@example.com',
        username: 'testuser',
        timezone: 'UTC',
        emailVerified: true,
        darkMode: false,
        siteLanguage: 'en',
        roles: [],
      } as any;

      const result = RequestUserService.hydrateRequestUser(dto);
      expect(result.id).toBeInstanceOf(Types.ObjectId);
      expect(result.email).toBe('test@example.com');
    });

    it('should handle optional lastLogin', () => {
      const dto = {
        id: new Types.ObjectId().toString(),
        email: 'test@example.com',
        username: 'testuser',
        timezone: 'UTC',
        emailVerified: true,
        darkMode: false,
        siteLanguage: 'en',
        roles: [],
        lastLogin: new Date().toISOString(),
      } as any;

      const result = RequestUserService.hydrateRequestUser(dto);
      expect(result.lastLogin).toBeInstanceOf(Date);
    });
  });
});
