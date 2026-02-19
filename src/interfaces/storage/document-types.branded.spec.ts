import { describe, expect, it } from '@jest/globals';
import type { CollectionSchemaFieldType, FieldSchema } from './document-types';

describe('document-types branded type extensions', () => {
  describe('CollectionSchemaFieldType includes branded literals', () => {
    it('accepts branded-primitive as a valid CollectionSchemaFieldType', () => {
      const type: CollectionSchemaFieldType = 'branded-primitive';
      expect(type).toBe('branded-primitive');
    });

    it('accepts branded-interface as a valid CollectionSchemaFieldType', () => {
      const type: CollectionSchemaFieldType = 'branded-interface';
      expect(type).toBe('branded-interface');
    });
  });

  describe('FieldSchema accepts branded types with ref', () => {
    it('constructs a FieldSchema with type branded-primitive and ref', () => {
      const schema: FieldSchema = {
        type: 'branded-primitive',
        ref: 'SomeId',
      };
      expect(schema.type).toBe('branded-primitive');
      expect(schema.ref).toBe('SomeId');
    });

    it('constructs a FieldSchema with type branded-interface and ref', () => {
      const schema: FieldSchema = {
        type: 'branded-interface',
        ref: 'SomeId',
      };
      expect(schema.type).toBe('branded-interface');
      expect(schema.ref).toBe('SomeId');
    });

    it('allows ref to be omitted (optional field)', () => {
      const schema: FieldSchema = {
        type: 'branded-primitive',
      };
      expect(schema.ref).toBeUndefined();
    });

    it('allows branded-primitive with additional constraints', () => {
      const schema: FieldSchema = {
        type: 'branded-primitive',
        ref: 'SomeId',
        required: true,
        minLength: 1,
        maxLength: 64,
      };
      expect(schema.type).toBe('branded-primitive');
      expect(schema.ref).toBe('SomeId');
      expect(schema.required).toBe(true);
    });
  });
});
