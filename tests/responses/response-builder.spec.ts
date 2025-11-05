import { ResponseBuilder, Response } from '../../src/responses/response-builder';
import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import { LanguageCodes } from '@digitaldefiance/i18n-lib';

describe('ResponseBuilder', () => {
  describe('static factory methods', () => {
    it('should create ok response', () => {
      const builder = ResponseBuilder.ok();
      const result = builder.build();
      expect(result.statusCode).toBe(200);
    });

    it('should create created response', () => {
      const builder = ResponseBuilder.created();
      const result = builder.build();
      expect(result.statusCode).toBe(201);
    });

    it('should create accepted response', () => {
      const builder = ResponseBuilder.accepted();
      const result = builder.build();
      expect(result.statusCode).toBe(202);
    });

    it('should create noContent response', () => {
      const builder = ResponseBuilder.noContent();
      const result = builder.build();
      expect(result.statusCode).toBe(204);
    });

    it('should create badRequest response', () => {
      const builder = ResponseBuilder.badRequest();
      const result = builder.build();
      expect(result.statusCode).toBe(400);
    });

    it('should create unauthorized response', () => {
      const builder = ResponseBuilder.unauthorized();
      const result = builder.build();
      expect(result.statusCode).toBe(401);
    });

    it('should create forbidden response', () => {
      const builder = ResponseBuilder.forbidden();
      const result = builder.build();
      expect(result.statusCode).toBe(403);
    });

    it('should create notFound response', () => {
      const builder = ResponseBuilder.notFound();
      const result = builder.build();
      expect(result.statusCode).toBe(404);
    });

    it('should create error response', () => {
      const builder = ResponseBuilder.error();
      const result = builder.build();
      expect(result.statusCode).toBe(500);
    });
  });

  describe('status', () => {
    it('should set custom status code', () => {
      const builder = new ResponseBuilder().status(418);
      const result = builder.build();
      expect(result.statusCode).toBe(418);
    });

    it('should override default status', () => {
      const builder = ResponseBuilder.ok().status(201);
      const result = builder.build();
      expect(result.statusCode).toBe(201);
    });

    it('should chain status calls', () => {
      const builder = new ResponseBuilder();
      const result = builder.status(200);
      expect(result).toBe(builder);
    });
  });

  describe('message', () => {
    it('should add message with translation key', () => {
      const builder = ResponseBuilder.ok()
        .message(SuiteCoreStringKey.Registration_Success);
      const result = builder.build();
      
      expect(result.response.message).toBeDefined();
      expect(typeof result.response.message).toBe('string');
    });

    it('should add message with params', () => {
      const builder = ResponseBuilder.ok()
        .message(SuiteCoreStringKey.Error_ServiceIsNotRegisteredTemplate, { key: 'test' });
      const result = builder.build();
      
      expect(result.response.message).toBeDefined();
    });

    it('should add message with language', () => {
      const builder = ResponseBuilder.ok()
        .message(SuiteCoreStringKey.Registration_Success, undefined, LanguageCodes.EN_US);
      const result = builder.build();
      
      expect(result.response.message).toBeDefined();
    });

    it('should chain message calls', () => {
      const builder = ResponseBuilder.ok();
      const result = builder.message(SuiteCoreStringKey.Registration_Success);
      expect(result).toBe(builder);
    });
  });

  describe('data', () => {
    it('should add data to response', () => {
      const data = { user: { id: 1, name: 'Test' } };
      const builder = ResponseBuilder.ok().data(data);
      const result = builder.build();
      
      expect(result.response.user).toEqual(data.user);
    });

    it('should merge multiple data calls', () => {
      const builder = ResponseBuilder.ok()
        .data({ field1: 'value1' })
        .data({ field2: 'value2' });
      const result = builder.build();
      
      expect(result.response.field1).toBe('value1');
      expect(result.response.field2).toBe('value2');
    });

    it('should override existing data fields', () => {
      const builder = ResponseBuilder.ok()
        .data({ field: 'old' })
        .data({ field: 'new' });
      const result = builder.build();
      
      expect(result.response.field).toBe('new');
    });

    it('should chain data calls', () => {
      const builder = ResponseBuilder.ok();
      const result = builder.data({ test: true });
      expect(result).toBe(builder);
    });
  });

  describe('headers', () => {
    it('should add headers to response', () => {
      const headers = { 'X-Custom': 'value' };
      const builder = ResponseBuilder.ok().headers(headers);
      const result = builder.build();
      
      expect(result.headers).toEqual(headers);
    });

    it('should chain headers calls', () => {
      const builder = ResponseBuilder.ok();
      const result = builder.headers({ 'X-Test': 'value' });
      expect(result).toBe(builder);
    });

    it('should not include headers if not set', () => {
      const builder = ResponseBuilder.ok();
      const result = builder.build();
      
      expect(result.headers).toBeUndefined();
    });
  });

  describe('build', () => {
    it('should build complete response', () => {
      const builder = ResponseBuilder.ok()
        .message(SuiteCoreStringKey.Registration_Success)
        .data({ user: { id: 1 } })
        .headers({ 'X-Custom': 'value' });
      
      const result = builder.build();
      
      expect(result.statusCode).toBe(200);
      expect(result.response.message).toBeDefined();
      expect(result.response.user).toEqual({ id: 1 });
      expect(result.headers).toEqual({ 'X-Custom': 'value' });
    });

    it('should build minimal response', () => {
      const builder = ResponseBuilder.ok();
      const result = builder.build();
      
      expect(result.statusCode).toBe(200);
      expect(result.response).toEqual({});
    });
  });

  describe('fluent API', () => {
    it('should support full fluent chain', () => {
      const result = ResponseBuilder
        .created()
        .message(SuiteCoreStringKey.Registration_Success)
        .data({ user: { id: 1, username: 'test' } })
        .headers({ 'Location': '/users/1' })
        .build();
      
      expect(result.statusCode).toBe(201);
      expect(result.response.message).toBeDefined();
      expect(result.response.user).toBeDefined();
      expect(result.headers).toBeDefined();
    });

    it('should support Response alias', () => {
      const result = Response
        .ok()
        .message(SuiteCoreStringKey.Registration_Success)
        .build();
      
      expect(result.statusCode).toBe(200);
    });
  });

  describe('real-world scenarios', () => {
    it('should create registration success response', () => {
      const result = Response
        .created()
        .message(SuiteCoreStringKey.Registration_Success)
        .data({
          user: { id: 1, username: 'newuser', email: 'user@example.com' },
          mnemonic: 'word1 word2 word3...'
        })
        .build();
      
      expect(result.statusCode).toBe(201);
      expect(result.response.user).toBeDefined();
      expect(result.response.mnemonic).toBeDefined();
    });

    it('should create login success response', () => {
      const result = Response
        .ok()
        .data({
          token: 'jwt-token',
          user: { id: 1, username: 'user' }
        })
        .build();
      
      expect(result.statusCode).toBe(200);
      expect(result.response.token).toBeDefined();
    });

    it('should create validation error response', () => {
      const result = Response
        .badRequest()
        .data({
          errors: [
            { field: 'username', message: 'Invalid username' },
            { field: 'email', message: 'Invalid email' }
          ]
        })
        .build();
      
      expect(result.statusCode).toBe(400);
      expect(result.response.errors).toHaveLength(2);
    });

    it('should create unauthorized response', () => {
      const result = Response
        .unauthorized()
        .build();
      
      expect(result.statusCode).toBe(401);
    });

    it('should create not found response', () => {
      const result = Response
        .notFound()
        .data({ resource: 'user', id: 123 })
        .build();
      
      expect(result.statusCode).toBe(404);
      expect(result.response.resource).toBe('user');
    });

    it('should create server error response', () => {
      const result = Response
        .error()
        .data({ errorId: 'err-12345' })
        .build();
      
      expect(result.statusCode).toBe(500);
      expect(result.response.errorId).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty data object', () => {
      const result = Response.ok().data({}).build();
      expect(result.response).toEqual({});
    });

    it('should handle null data values', () => {
      const result = Response.ok().data({ value: null }).build();
      expect(result.response.value).toBeNull();
    });

    it('should handle undefined data values', () => {
      const result = Response.ok().data({ value: undefined }).build();
      expect(result.response.value).toBeUndefined();
    });

    it('should handle complex nested data', () => {
      const complexData = {
        user: {
          id: 1,
          profile: {
            name: 'Test',
            settings: {
              theme: 'dark'
            }
          }
        }
      };
      
      const result = Response.ok().data(complexData).build();
      expect(result.response.user.profile.settings.theme).toBe('dark');
    });
  });
});
