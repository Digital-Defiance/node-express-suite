import 'reflect-metadata';
import { ApiProperty, ApiSchema } from '../../src/decorators/schema';
import { OpenAPISchemaRegistry } from '../../src/openapi/schemas';
import { OpenAPIBuilder } from '../../src/openapi/builder';
import { ControllerRegistry } from '../../src/registry/controller-registry';
import { ApiController } from '../../src/decorators/controller';
import { Get, Post } from '../../src/decorators/http-methods';
import { Returns } from '../../src/decorators/response';
import { ApiSummary, ApiTags } from '../../src/decorators/openapi';

describe('Schema Decorators Integration with OpenAPIBuilder', () => {
  beforeEach(() => {
    OpenAPISchemaRegistry.clear();
    ControllerRegistry.clear();
  });

  describe('Schema registration and OpenAPI spec generation', () => {
    it('should include decorated schemas in OpenAPI spec components', () => {
      // Define schemas using decorators
      @ApiSchema({ description: 'A user entity' })
      class User {
        @ApiProperty({ type: 'string', description: 'User ID', required: true })
        id!: string;

        @ApiProperty({ type: 'string', format: 'email', required: true })
        email!: string;

        @ApiProperty({ type: 'string' })
        name!: string;
      }

      @ApiSchema({ description: 'Error response' })
      class ApiError {
        @ApiProperty({ type: 'string', required: true })
        code!: string;

        @ApiProperty({ type: 'string', required: true })
        message!: string;
      }

      // Build OpenAPI spec
      const builder = new OpenAPIBuilder({
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API with schema decorators',
      });

      const spec = builder.build();

      // Verify schemas are in components
      expect(spec.components.schemas).toHaveProperty('User');
      expect(spec.components.schemas).toHaveProperty('ApiError');

      // Verify User schema structure
      const userSchema = spec.components.schemas.User as Record<
        string,
        unknown
      >;
      expect(userSchema.type).toBe('object');
      expect(userSchema.description).toBe('A user entity');
      expect(userSchema.required).toContain('id');
      expect(userSchema.required).toContain('email');

      const userProps = userSchema.properties as Record<
        string,
        Record<string, unknown>
      >;
      expect(userProps.id.type).toBe('string');
      expect(userProps.email.format).toBe('email');

      // Verify ApiError schema structure
      const errorSchema = spec.components.schemas.ApiError as Record<
        string,
        unknown
      >;
      expect(errorSchema.type).toBe('object');
      expect(errorSchema.required).toContain('code');
      expect(errorSchema.required).toContain('message');
    });

    it('should work with inherited schemas', () => {
      // Base entity with common fields
      class BaseEntity {
        @ApiProperty({ type: 'string', required: true })
        id!: string;

        @ApiProperty({ type: 'string', format: 'date-time' })
        createdAt!: string;

        @ApiProperty({ type: 'string', format: 'date-time' })
        updatedAt!: string;
      }

      @ApiSchema({ description: 'Product entity' })
      class Product extends BaseEntity {
        @ApiProperty({ type: 'string', required: true })
        name!: string;

        @ApiProperty({ type: 'number', minimum: 0 })
        price!: number;
      }

      const builder = new OpenAPIBuilder({
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API',
      });

      const spec = builder.build();

      const productSchema = spec.components.schemas.Product as Record<
        string,
        unknown
      >;
      const props = productSchema.properties as Record<
        string,
        Record<string, unknown>
      >;

      // Should have inherited properties
      expect(props.id).toBeDefined();
      expect(props.createdAt).toBeDefined();
      expect(props.updatedAt).toBeDefined();

      // Should have own properties
      expect(props.name).toBeDefined();
      expect(props.price).toBeDefined();
      expect(props.price.minimum).toBe(0);

      // Required should include inherited required fields
      expect(productSchema.required).toContain('id');
      expect(productSchema.required).toContain('name');
    });

    it('should support schema references between schemas', () => {
      @ApiSchema()
      class Address {
        @ApiProperty({ type: 'string', required: true })
        street!: string;

        @ApiProperty({ type: 'string', required: true })
        city!: string;

        @ApiProperty({ type: 'string' })
        zipCode!: string;
      }

      @ApiSchema()
      class Customer {
        @ApiProperty({ type: 'string', required: true })
        name!: string;

        @ApiProperty({ $ref: 'Address' })
        billingAddress!: Address;

        @ApiProperty({ $ref: 'Address' })
        shippingAddress!: Address;
      }

      const builder = new OpenAPIBuilder({
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API',
      });

      const spec = builder.build();

      // Both schemas should be registered
      expect(spec.components.schemas).toHaveProperty('Address');
      expect(spec.components.schemas).toHaveProperty('Customer');

      // Customer should have $ref to Address
      const customerSchema = spec.components.schemas.Customer as Record<
        string,
        unknown
      >;
      const props = customerSchema.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect(props.billingAddress.$ref).toBe('#/components/schemas/Address');
      expect(props.shippingAddress.$ref).toBe('#/components/schemas/Address');
    });

    it('should support array of schema references', () => {
      @ApiSchema()
      class OrderItem {
        @ApiProperty({ type: 'string', required: true })
        productId!: string;

        @ApiProperty({ type: 'integer', minimum: 1, required: true })
        quantity!: number;

        @ApiProperty({ type: 'number' })
        unitPrice!: number;
      }

      @ApiSchema()
      class Order {
        @ApiProperty({ type: 'string', required: true })
        orderId!: string;

        @ApiProperty({ type: 'array', items: 'OrderItem', required: true })
        items!: OrderItem[];

        @ApiProperty({ type: 'number' })
        total!: number;
      }

      const builder = new OpenAPIBuilder({
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API',
      });

      const spec = builder.build();

      const orderSchema = spec.components.schemas.Order as Record<
        string,
        unknown
      >;
      const props = orderSchema.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect(props.items.type).toBe('array');
      expect((props.items.items as Record<string, unknown>).$ref).toBe(
        '#/components/schemas/OrderItem',
      );
    });

    it('should work with controllers that reference schemas', () => {
      // Define schemas
      @ApiSchema({ description: 'User entity' })
      class UserDto {
        @ApiProperty({ type: 'string', required: true })
        id!: string;

        @ApiProperty({ type: 'string', required: true })
        name!: string;
      }

      // Define controller that uses the schema
      @ApiTags('Users')
      @ApiController('/users')
      class UserController {
        @ApiSummary('Get all users')
        @Returns(200, 'UserDto', 'List of users')
        @Get('/')
        listUsers() {
          return [];
        }

        @ApiSummary('Get user by ID')
        @Returns(200, 'UserDto', 'User details')
        @Returns(404, 'ErrorResponse', 'User not found')
        @Get('/:id')
        getUser() {
          return {};
        }

        @ApiSummary('Create user')
        @Returns(201, 'UserDto', 'Created user')
        @Post('/')
        createUser() {
          return {};
        }
      }

      // Register controller with correct signature
      ControllerRegistry.register('/users', 'UserController', [
        {
          method: 'get',
          path: '/',
          handlerKey: 'listUsers',
          openapi: {
            summary: 'Get all users',
            tags: ['Users'],
            responses: {
              200: { description: 'List of users', schema: 'UserDto' },
            },
          },
        },
        {
          method: 'get',
          path: '/:id',
          handlerKey: 'getUser',
          openapi: {
            summary: 'Get user by ID',
            tags: ['Users'],
            responses: {
              200: { description: 'User details', schema: 'UserDto' },
              404: { description: 'User not found', schema: 'ErrorResponse' },
            },
          },
        },
      ]);

      const builder = new OpenAPIBuilder({
        title: 'User API',
        version: '1.0.0',
        description: 'API for managing users',
      });

      const spec = builder.build();

      // Schema should be in components
      expect(spec.components.schemas).toHaveProperty('UserDto');

      // Paths should be generated
      expect(spec.paths).toHaveProperty('/users');
      expect(spec.paths).toHaveProperty('/users/{id}');

      // Verify path operations reference the schema
      const listOp = spec.paths['/users'].get as Record<string, unknown>;
      expect(listOp.summary).toBe('Get all users');

      const getOp = spec.paths['/users/{id}'].get as Record<string, unknown>;
      expect(getOp.summary).toBe('Get user by ID');
    });

    it('should handle complex nested schemas', () => {
      @ApiSchema()
      class Pagination {
        @ApiProperty({ type: 'integer', minimum: 1 })
        page!: number;

        @ApiProperty({ type: 'integer', minimum: 1, maximum: 100 })
        pageSize!: number;

        @ApiProperty({ type: 'integer' })
        total!: number;
      }

      @ApiSchema()
      class UserSummary {
        @ApiProperty({ type: 'string' })
        id!: string;

        @ApiProperty({ type: 'string' })
        name!: string;
      }

      @ApiSchema({ description: 'Paginated list of users' })
      class UserListResponse {
        @ApiProperty({ type: 'array', items: 'UserSummary' })
        items!: UserSummary[];

        @ApiProperty({ $ref: 'Pagination' })
        pagination!: Pagination;
      }

      const builder = new OpenAPIBuilder({
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API',
      });

      const spec = builder.build();

      // All schemas should be registered
      expect(spec.components.schemas).toHaveProperty('Pagination');
      expect(spec.components.schemas).toHaveProperty('UserSummary');
      expect(spec.components.schemas).toHaveProperty('UserListResponse');

      // Verify nested references
      const responseSchema = spec.components.schemas.UserListResponse as Record<
        string,
        unknown
      >;
      const props = responseSchema.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect((props.items.items as Record<string, unknown>).$ref).toBe(
        '#/components/schemas/UserSummary',
      );
      expect(props.pagination.$ref).toBe('#/components/schemas/Pagination');
    });

    it('should preserve schema examples in OpenAPI spec', () => {
      @ApiSchema({
        description: 'API response wrapper',
        example: {
          success: true,
          data: { id: '123', name: 'Test' },
          timestamp: '2024-01-01T00:00:00Z',
        },
      })
      class ApiResponse {
        @ApiProperty({ type: 'boolean', example: true })
        success!: boolean;

        @ApiProperty({ type: 'object' })
        data!: object;

        @ApiProperty({ type: 'string', format: 'date-time' })
        timestamp!: string;
      }

      const builder = new OpenAPIBuilder({
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API',
      });

      const spec = builder.build();

      const schema = spec.components.schemas.ApiResponse as Record<
        string,
        unknown
      >;
      expect(schema.example).toEqual({
        success: true,
        data: { id: '123', name: 'Test' },
        timestamp: '2024-01-01T00:00:00Z',
      });

      const props = schema.properties as Record<
        string,
        Record<string, unknown>
      >;
      expect(props.success.example).toBe(true);
    });

    it('should handle enum properties correctly', () => {
      @ApiSchema()
      class Task {
        @ApiProperty({ type: 'string', required: true })
        id!: string;

        @ApiProperty({ type: 'string', required: true })
        title!: string;

        @ApiProperty({
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
          required: true,
        })
        status!: string;

        @ApiProperty({
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
        })
        priority!: string;
      }

      const builder = new OpenAPIBuilder({
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API',
      });

      const spec = builder.build();

      const taskSchema = spec.components.schemas.Task as Record<
        string,
        unknown
      >;
      const props = taskSchema.properties as Record<
        string,
        Record<string, unknown>
      >;

      expect(props.status.enum).toEqual([
        'pending',
        'in_progress',
        'completed',
        'cancelled',
      ]);
      expect(props.priority.enum).toEqual([
        'low',
        'medium',
        'high',
        'critical',
      ]);
    });
  });
});
