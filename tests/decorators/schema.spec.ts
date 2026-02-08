import 'reflect-metadata';
import {
  ApiProperty,
  ApiSchema,
  getAllPropertyMetadata,
  getPropertyMetadata,
  getSchemaMetadata,
  hasSchemaMetadata,
  registerSchema,
} from '../../src/decorators/schema';
import { OpenAPISchemaRegistry } from '../../src/openapi/schemas';
import { SCHEMA_METADATA } from '../../src/decorators/metadata-keys';

describe('Schema Decorators', () => {
  beforeEach(() => {
    // Clear the registry before each test
    OpenAPISchemaRegistry.clear();
  });

  describe('@ApiSchema', () => {
    it('should register a schema with the class name by default', () => {
      @ApiSchema()
      class User {
        @ApiProperty({ type: 'string' })
        id!: string;
      }

      expect(OpenAPISchemaRegistry.hasSchema('User')).toBe(true);
      const schema = OpenAPISchemaRegistry.getSchema('User');
      expect(schema).toBeDefined();
      expect(schema?.type).toBe('object');
    });

    it('should register a schema with a custom name', () => {
      @ApiSchema({ name: 'CustomUser' })
      class User {
        @ApiProperty({ type: 'string' })
        id!: string;
      }

      expect(OpenAPISchemaRegistry.hasSchema('CustomUser')).toBe(true);
      expect(OpenAPISchemaRegistry.hasSchema('User')).toBe(false);
    });

    it('should include description in the schema', () => {
      @ApiSchema({ description: 'A user entity' })
      class UserWithDescription {
        @ApiProperty({ type: 'string' })
        id!: string;
      }

      const schema = OpenAPISchemaRegistry.getSchema('UserWithDescription');
      expect(schema?.description).toBe('A user entity');
    });

    it('should include example in the schema', () => {
      @ApiSchema({ example: { id: '123', name: 'John' } })
      class UserWithExample {
        @ApiProperty({ type: 'string' })
        id!: string;
      }

      const schema = OpenAPISchemaRegistry.getSchema('UserWithExample');
      expect(schema?.example).toEqual({ id: '123', name: 'John' });
    });

    it('should store metadata on the class', () => {
      @ApiSchema({ description: 'Test schema' })
      class TestClass {
        @ApiProperty({ type: 'string' })
        field!: string;
      }

      const metadata = Reflect.getMetadata(SCHEMA_METADATA, TestClass);
      expect(metadata).toBeDefined();
      expect(metadata.name).toBe('TestClass');
      expect(metadata.options.description).toBe('Test schema');
    });

    it('should register multiple schemas without conflicts', () => {
      @ApiSchema()
      class SchemaA {
        @ApiProperty({ type: 'string' })
        fieldA!: string;
      }

      @ApiSchema()
      class SchemaB {
        @ApiProperty({ type: 'number' })
        fieldB!: number;
      }

      expect(OpenAPISchemaRegistry.hasSchema('SchemaA')).toBe(true);
      expect(OpenAPISchemaRegistry.hasSchema('SchemaB')).toBe(true);

      const schemaA = OpenAPISchemaRegistry.getSchema('SchemaA');
      const schemaB = OpenAPISchemaRegistry.getSchema('SchemaB');

      expect(
        (schemaA?.properties as Record<string, { type: string }>)?.fieldA?.type,
      ).toBe('string');
      expect(
        (schemaB?.properties as Record<string, { type: string }>)?.fieldB?.type,
      ).toBe('number');
    });

    it('should handle schema with no properties', () => {
      @ApiSchema({ description: 'Empty schema' })
      class EmptySchema {}

      const schema = OpenAPISchemaRegistry.getSchema('EmptySchema');
      expect(schema).toBeDefined();
      expect(schema?.type).toBe('object');
      expect(schema?.properties).toBeUndefined();
    });
  });

  describe('@ApiProperty', () => {
    it('should add property with type', () => {
      @ApiSchema()
      class TypedProps {
        @ApiProperty({ type: 'string' })
        stringField!: string;

        @ApiProperty({ type: 'number' })
        numberField!: number;

        @ApiProperty({ type: 'boolean' })
        booleanField!: boolean;
      }

      const schema = OpenAPISchemaRegistry.getSchema('TypedProps');
      const props = schema?.properties as Record<string, { type: string }>;

      expect(props.stringField.type).toBe('string');
      expect(props.numberField.type).toBe('number');
      expect(props.booleanField.type).toBe('boolean');
    });

    it('should add property with format', () => {
      @ApiSchema()
      class FormattedProps {
        @ApiProperty({ type: 'string', format: 'email' })
        email!: string;

        @ApiProperty({ type: 'string', format: 'date-time' })
        createdAt!: string;

        @ApiProperty({ type: 'string', format: 'uuid' })
        id!: string;
      }

      const schema = OpenAPISchemaRegistry.getSchema('FormattedProps');
      const props = schema?.properties as Record<
        string,
        { type: string; format: string }
      >;

      expect(props.email.format).toBe('email');
      expect(props.createdAt.format).toBe('date-time');
      expect(props.id.format).toBe('uuid');
    });

    it('should add property with description', () => {
      @ApiSchema()
      class DescribedProps {
        @ApiProperty({ type: 'string', description: 'The user ID' })
        id!: string;
      }

      const schema = OpenAPISchemaRegistry.getSchema('DescribedProps');
      const props = schema?.properties as Record<
        string,
        { description: string }
      >;

      expect(props.id.description).toBe('The user ID');
    });

    it('should add property with example', () => {
      @ApiSchema()
      class ExampleProps {
        @ApiProperty({ type: 'string', example: 'john@example.com' })
        email!: string;
      }

      const schema = OpenAPISchemaRegistry.getSchema('ExampleProps');
      const props = schema?.properties as Record<string, { example: string }>;

      expect(props.email.example).toBe('john@example.com');
    });

    it('should add property with enum', () => {
      @ApiSchema()
      class EnumProps {
        @ApiProperty({
          type: 'string',
          enum: ['active', 'inactive', 'pending'],
        })
        status!: string;
      }

      const schema = OpenAPISchemaRegistry.getSchema('EnumProps');
      const props = schema?.properties as Record<string, { enum: string[] }>;

      expect(props.status.enum).toEqual(['active', 'inactive', 'pending']);
    });

    it('should add property with nullable', () => {
      @ApiSchema()
      class NullableProps {
        @ApiProperty({ type: 'string', nullable: true })
        optionalField!: string | null;
      }

      const schema = OpenAPISchemaRegistry.getSchema('NullableProps');
      const props = schema?.properties as Record<string, { nullable: boolean }>;

      expect(props.optionalField.nullable).toBe(true);
    });

    it('should add property with numeric constraints', () => {
      @ApiSchema()
      class NumericProps {
        @ApiProperty({ type: 'integer', minimum: 0, maximum: 100 })
        percentage!: number;
      }

      const schema = OpenAPISchemaRegistry.getSchema('NumericProps');
      const props = schema?.properties as Record<
        string,
        { minimum: number; maximum: number }
      >;

      expect(props.percentage.minimum).toBe(0);
      expect(props.percentage.maximum).toBe(100);
    });

    it('should add property with string constraints', () => {
      @ApiSchema()
      class StringProps {
        @ApiProperty({
          type: 'string',
          minLength: 3,
          maxLength: 50,
          pattern: '^[a-zA-Z]+$',
        })
        name!: string;
      }

      const schema = OpenAPISchemaRegistry.getSchema('StringProps');
      const props = schema?.properties as Record<
        string,
        { minLength: number; maxLength: number; pattern: string }
      >;

      expect(props.name.minLength).toBe(3);
      expect(props.name.maxLength).toBe(50);
      expect(props.name.pattern).toBe('^[a-zA-Z]+$');
    });

    it('should add property with array items', () => {
      @ApiSchema()
      class ArrayProps {
        @ApiProperty({ type: 'array', items: { type: 'string' } })
        tags!: string[];
      }

      const schema = OpenAPISchemaRegistry.getSchema('ArrayProps');
      const props = schema?.properties as Record<
        string,
        { type: string; items: { type: string } }
      >;

      expect(props.tags.type).toBe('array');
      expect(props.tags.items.type).toBe('string');
    });

    it('should add property with $ref', () => {
      @ApiSchema()
      class RefProps {
        @ApiProperty({ $ref: 'Address' })
        address!: object;
      }

      const schema = OpenAPISchemaRegistry.getSchema('RefProps');
      const props = schema?.properties as Record<string, { $ref: string }>;

      expect(props.address.$ref).toBe('#/components/schemas/Address');
    });

    it('should add property with items as string reference', () => {
      @ApiSchema()
      class ArrayRefProps {
        @ApiProperty({ type: 'array', items: 'User' })
        users!: object[];
      }

      const schema = OpenAPISchemaRegistry.getSchema('ArrayRefProps');
      const props = schema?.properties as Record<
        string,
        { items: { $ref: string } }
      >;

      expect(props.users.items.$ref).toBe('#/components/schemas/User');
    });

    it('should track required properties', () => {
      @ApiSchema()
      class RequiredProps {
        @ApiProperty({ type: 'string', required: true })
        requiredField!: string;

        @ApiProperty({ type: 'string', required: false })
        optionalField!: string;

        @ApiProperty({ type: 'string' })
        defaultField!: string;
      }

      const schema = OpenAPISchemaRegistry.getSchema('RequiredProps');
      expect(schema?.required).toEqual(['requiredField']);
    });
  });

  describe('Inheritance support', () => {
    it('should include parent class properties', () => {
      class BaseEntity {
        @ApiProperty({ type: 'string', description: 'Unique identifier' })
        id!: string;

        @ApiProperty({ type: 'string', format: 'date-time' })
        createdAt!: string;
      }

      @ApiSchema()
      class User extends BaseEntity {
        @ApiProperty({ type: 'string' })
        name!: string;

        @ApiProperty({ type: 'string', format: 'email' })
        email!: string;
      }

      const schema = OpenAPISchemaRegistry.getSchema('User');
      const props = schema?.properties as Record<string, { type: string }>;

      // Should have both parent and child properties
      expect(props.id).toBeDefined();
      expect(props.createdAt).toBeDefined();
      expect(props.name).toBeDefined();
      expect(props.email).toBeDefined();
    });

    it('should allow child to override parent properties', () => {
      class BaseEntity {
        @ApiProperty({ type: 'string', description: 'Base ID' })
        id!: string;
      }

      @ApiSchema()
      class ChildEntity extends BaseEntity {
        @ApiProperty({ type: 'integer', description: 'Numeric ID' })
        id!: number;
      }

      const schema = OpenAPISchemaRegistry.getSchema('ChildEntity');
      const props = schema?.properties as Record<
        string,
        { type: string; description: string }
      >;

      // Child property should override parent
      expect(props.id.type).toBe('integer');
      expect(props.id.description).toBe('Numeric ID');
    });

    it('should support multi-level inheritance', () => {
      class GrandParent {
        @ApiProperty({ type: 'string' })
        grandParentField!: string;
      }

      class Parent extends GrandParent {
        @ApiProperty({ type: 'string' })
        parentField!: string;
      }

      @ApiSchema()
      class Child extends Parent {
        @ApiProperty({ type: 'string' })
        childField!: string;
      }

      const schema = OpenAPISchemaRegistry.getSchema('Child');
      const props = schema?.properties as Record<string, { type: string }>;

      expect(props.grandParentField).toBeDefined();
      expect(props.parentField).toBeDefined();
      expect(props.childField).toBeDefined();
    });

    it('should combine required fields from parent and child', () => {
      class BaseEntity {
        @ApiProperty({ type: 'string', required: true })
        id!: string;
      }

      @ApiSchema()
      class User extends BaseEntity {
        @ApiProperty({ type: 'string', required: true })
        email!: string;
      }

      const schema = OpenAPISchemaRegistry.getSchema('User');
      expect(schema?.required).toContain('id');
      expect(schema?.required).toContain('email');
    });
  });

  describe('Helper functions', () => {
    describe('getSchemaMetadata', () => {
      it('should return schema metadata for decorated class', () => {
        @ApiSchema({ description: 'Test' })
        class TestSchema {
          @ApiProperty({ type: 'string' })
          field!: string;
        }

        const metadata = getSchemaMetadata(TestSchema);
        expect(metadata).toBeDefined();
        expect(metadata?.name).toBe('TestSchema');
        expect(metadata?.options.description).toBe('Test');
      });

      it('should return undefined for non-decorated class', () => {
        class PlainClass {}

        const metadata = getSchemaMetadata(PlainClass);
        expect(metadata).toBeUndefined();
      });
    });

    describe('getPropertyMetadata', () => {
      it('should return property metadata for class', () => {
        @ApiSchema()
        class PropTest {
          @ApiProperty({ type: 'string' })
          field1!: string;

          @ApiProperty({ type: 'number' })
          field2!: number;
        }

        const props = getPropertyMetadata(PropTest);
        expect(props).toHaveLength(2);
        expect(props.map((p) => p.propertyKey)).toContain('field1');
        expect(props.map((p) => p.propertyKey)).toContain('field2');
      });

      it('should return empty array for class without properties', () => {
        class NoProps {}

        const props = getPropertyMetadata(NoProps);
        expect(props).toEqual([]);
      });
    });

    describe('getAllPropertyMetadata', () => {
      it('should return all properties including inherited', () => {
        class Parent {
          @ApiProperty({ type: 'string' })
          parentField!: string;
        }

        @ApiSchema()
        class Child extends Parent {
          @ApiProperty({ type: 'string' })
          childField!: string;
        }

        const props = getAllPropertyMetadata(Child);
        expect(props.map((p) => p.propertyKey)).toContain('parentField');
        expect(props.map((p) => p.propertyKey)).toContain('childField');
      });
    });

    describe('hasSchemaMetadata', () => {
      it('should return true for decorated class', () => {
        @ApiSchema()
        class DecoratedClass {}

        expect(hasSchemaMetadata(DecoratedClass)).toBe(true);
      });

      it('should return false for non-decorated class', () => {
        class PlainClass {}

        expect(hasSchemaMetadata(PlainClass)).toBe(false);
      });
    });

    describe('registerSchema', () => {
      it('should re-register a schema', () => {
        @ApiSchema({ name: 'OriginalName' })
        class ReRegisterTest {
          @ApiProperty({ type: 'string' })
          field!: string;
        }

        // Clear and re-register
        OpenAPISchemaRegistry.clear();
        expect(OpenAPISchemaRegistry.hasSchema('OriginalName')).toBe(false);

        registerSchema(ReRegisterTest);
        expect(OpenAPISchemaRegistry.hasSchema('OriginalName')).toBe(true);
      });
    });
  });

  describe('Type inference', () => {
    it('should work with explicit types', () => {
      @ApiSchema()
      class ExplicitTypes {
        @ApiProperty({ type: 'string' })
        stringField!: string;

        @ApiProperty({ type: 'integer' })
        intField!: number;
      }

      const schema = OpenAPISchemaRegistry.getSchema('ExplicitTypes');
      const props = schema?.properties as Record<string, { type: string }>;

      expect(props.stringField.type).toBe('string');
      expect(props.intField.type).toBe('integer');
    });
  });

  describe('Complex schemas', () => {
    it('should handle nested object references', () => {
      @ApiSchema()
      class Address {
        @ApiProperty({ type: 'string' })
        street!: string;

        @ApiProperty({ type: 'string' })
        city!: string;
      }

      @ApiSchema()
      class Person {
        @ApiProperty({ type: 'string' })
        name!: string;

        @ApiProperty({ $ref: 'Address' })
        address!: Address;
      }

      const personSchema = OpenAPISchemaRegistry.getSchema('Person');
      const props = personSchema?.properties as Record<
        string,
        { $ref?: string }
      >;

      expect(props.address.$ref).toBe('#/components/schemas/Address');
    });

    it('should handle array of references', () => {
      @ApiSchema()
      class Tag {
        @ApiProperty({ type: 'string' })
        name!: string;
      }

      @ApiSchema()
      class Article {
        @ApiProperty({ type: 'string' })
        title!: string;

        @ApiProperty({ type: 'array', items: 'Tag' })
        tags!: Tag[];
      }

      const articleSchema = OpenAPISchemaRegistry.getSchema('Article');
      const props = articleSchema?.properties as Record<
        string,
        { items?: { $ref: string } }
      >;

      expect(props.tags.items?.$ref).toBe('#/components/schemas/Tag');
    });
  });
});
