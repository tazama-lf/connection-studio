import { Test, TestingModule } from '@nestjs/testing';
import { JSONSchemaConverterService } from './json-schema-converter.service';
import {
  SchemaField,
  FieldType,
  JSONSchema,
  JSONSchemaType,
  JSONSchemaFormat,
  JSONSchemaProperty,
} from '@tazama-lf/tcs-lib';
import { AuditService } from '../audit/audit.service';

describe('JSONSchemaConverterService', () => {
  let service: JSONSchemaConverterService;
  let auditService: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JSONSchemaConverterService,
        {
          provide: AuditService,
          useValue: {
            logAction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<JSONSchemaConverterService>(
      JSONSchemaConverterService,
    );
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('convertToJSONSchema', () => {
    it('should convert simple fields to JSON Schema', () => {
      const fields: SchemaField[] = [
        {
          name: 'name',
          path: 'name',
          type: FieldType.STRING,
          isRequired: true,
        },
        { name: 'age', path: 'age', type: FieldType.NUMBER, isRequired: false },
        {
          name: 'active',
          path: 'active',
          type: FieldType.BOOLEAN,
          isRequired: true,
        },
      ];

      const schema = service.convertToJSONSchema(fields);

      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties!['name'].type).toBe(JSONSchemaType.STRING);
      expect(schema.properties!['age'].type).toBe(JSONSchemaType.NUMBER);
      expect(schema.properties!['active'].type).toBe(JSONSchemaType.BOOLEAN);
      expect(schema.required).toEqual(['name', 'active']);
      expect(schema.additionalProperties).toBe(false);
    });

    it('should convert DATE field with format', () => {
      const fields: SchemaField[] = [
        {
          name: 'timestamp',
          path: 'timestamp',
          type: FieldType.DATE,
          isRequired: true,
        },
      ];

      const schema = service.convertToJSONSchema(fields);

      expect(schema.properties!['timestamp'].type).toBe(JSONSchemaType.STRING);
      expect(schema.properties!['timestamp'].format).toBe(
        JSONSchemaFormat.DATE_TIME,
      );
    });

    it('should convert nested object fields', () => {
      const fields: SchemaField[] = [
        {
          name: 'user',
          path: 'user',
          type: FieldType.OBJECT,
          isRequired: true,
          children: [
            {
              name: 'name',
              path: 'user.name',
              type: FieldType.STRING,
              isRequired: true,
            },
            {
              name: 'email',
              path: 'user.email',
              type: FieldType.STRING,
              isRequired: false,
            },
          ],
        },
      ];

      const schema = service.convertToJSONSchema(fields);

      expect(schema.properties!['user'].type).toBe(JSONSchemaType.OBJECT);
      expect(schema.properties!['user'].properties).toBeDefined();
      expect(schema.properties!['user'].properties!['name'].type).toBe(
        JSONSchemaType.STRING,
      );
      expect(schema.properties!['user'].required).toEqual(['name']);
      expect(schema.properties!['user'].additionalProperties).toBe(false);
    });

    it('should convert array fields with simple types', () => {
      const fields: SchemaField[] = [
        {
          name: 'tags',
          path: 'tags',
          type: FieldType.ARRAY,
          arrayElementType: FieldType.STRING,
          isRequired: true,
        },
        {
          name: 'scores',
          path: 'scores',
          type: FieldType.ARRAY,
          arrayElementType: FieldType.NUMBER,
          isRequired: false,
        },
      ];

      const schema = service.convertToJSONSchema(fields);

      expect(schema.properties!['tags'].type).toBe(JSONSchemaType.ARRAY);
      expect(schema.properties!['tags'].items?.type).toBe(
        JSONSchemaType.STRING,
      );
      expect(schema.properties!['scores'].items?.type).toBe(
        JSONSchemaType.NUMBER,
      );
    });

    it('should convert array fields with object elements', () => {
      const fields: SchemaField[] = [
        {
          name: 'users',
          path: 'users',
          type: FieldType.ARRAY,
          arrayElementType: FieldType.OBJECT,
          isRequired: true,
          children: [
            {
              name: 'id',
              path: 'users.0.id',
              type: FieldType.NUMBER,
              isRequired: true,
            },
            {
              name: 'name',
              path: 'users.0.name',
              type: FieldType.STRING,
              isRequired: true,
            },
          ],
        },
      ];

      const schema = service.convertToJSONSchema(fields);

      const usersProperty = schema.properties!['users'];
      expect(usersProperty.type).toBe(JSONSchemaType.ARRAY);
      expect(usersProperty.items?.type).toBe(JSONSchemaType.OBJECT);
      expect(usersProperty.items?.properties).toBeDefined();
      expect(usersProperty.items?.properties!['id'].type).toBe(
        JSONSchemaType.NUMBER,
      );
      expect(usersProperty.items?.required).toEqual(['id', 'name']);
      expect(usersProperty.items?.additionalProperties).toBe(false);
    });

    it('should handle array with children but no arrayElementType', () => {
      const fields: SchemaField[] = [
        {
          name: 'items',
          path: 'items',
          type: FieldType.ARRAY,
          isRequired: true,
          children: [
            {
              name: 'value',
              path: 'items.0.value',
              type: FieldType.STRING,
              isRequired: true,
            },
          ],
        },
      ];

      const schema = service.convertToJSONSchema(fields);

      const itemsProperty = schema.properties!['items'];
      expect(itemsProperty.items?.type).toBe(JSONSchemaType.OBJECT);
      expect(itemsProperty.items?.properties!['value']).toBeDefined();
    });

    it('should not include required array if no required fields', () => {
      const fields: SchemaField[] = [
        {
          name: 'optional',
          path: 'optional',
          type: FieldType.STRING,
          isRequired: false,
        },
      ];

      const schema = service.convertToJSONSchema(fields);

      expect(schema.required).toBeUndefined();
    });

    it('should handle object with no required children', () => {
      const fields: SchemaField[] = [
        {
          name: 'metadata',
          path: 'metadata',
          type: FieldType.OBJECT,
          isRequired: true,
          children: [
            {
              name: 'optional1',
              path: 'metadata.optional1',
              type: FieldType.STRING,
              isRequired: false,
            },
            {
              name: 'optional2',
              path: 'metadata.optional2',
              type: FieldType.NUMBER,
              isRequired: false,
            },
          ],
        },
      ];

      const schema = service.convertToJSONSchema(fields);

      expect(schema.properties!['metadata'].required).toBeUndefined();
    });

    it('should handle unknown field type as STRING', () => {
      const fields: SchemaField[] = [
        {
          name: 'unknown',
          path: 'unknown',
          type: 'UNKNOWN' as FieldType,
          isRequired: true,
        },
      ];

      const schema = service.convertToJSONSchema(fields);

      expect(schema.properties!['unknown'].type).toBe(JSONSchemaType.STRING);
    });

    it('should log audit action when converting', () => {
      const fields: SchemaField[] = [
        {
          name: 'test',
          path: 'test',
          type: FieldType.STRING,
          isRequired: true,
        },
      ];

      service.convertToJSONSchema(fields);

      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'SCHEMA',
          action: 'CONVERT_TO_JSON_SCHEMA',
          actor: 'SYSTEM',
          status: 'SUCCESS',
        }),
      );
    });

    it('should handle deeply nested structures', () => {
      const fields: SchemaField[] = [
        {
          name: 'level1',
          path: 'level1',
          type: FieldType.OBJECT,
          isRequired: true,
          children: [
            {
              name: 'level2',
              path: 'level1.level2',
              type: FieldType.OBJECT,
              isRequired: true,
              children: [
                {
                  name: 'value',
                  path: 'level1.level2.value',
                  type: FieldType.STRING,
                  isRequired: true,
                },
              ],
            },
          ],
        },
      ];

      const schema = service.convertToJSONSchema(fields);

      expect(
        schema.properties!['level1'].properties!['level2'].properties!['value']
          .type,
      ).toBe(JSONSchemaType.STRING);
    });
  });

  describe('convertFromJSONSchema', () => {
    it('should convert simple JSON Schema to fields', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: JSONSchemaType.STRING },
          age: { type: JSONSchemaType.NUMBER },
          active: { type: JSONSchemaType.BOOLEAN },
        },
        required: ['name', 'active'],
      };

      const fields = service.convertFromJSONSchema(schema);

      expect(fields).toHaveLength(3);
      expect(fields.find((f) => f.name === 'name')?.isRequired).toBe(true);
      expect(fields.find((f) => f.name === 'age')?.isRequired).toBe(false);
      expect(fields.find((f) => f.name === 'active')?.isRequired).toBe(true);
    });

    it('should convert date-time format to DATE type', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          timestamp: {
            type: JSONSchemaType.STRING,
            format: JSONSchemaFormat.DATE_TIME,
          },
        },
      };

      const fields = service.convertFromJSONSchema(schema);

      expect(fields[0].type).toBe(FieldType.DATE);
    });

    it('should convert nested object schema', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          user: {
            type: JSONSchemaType.OBJECT,
            properties: {
              name: { type: JSONSchemaType.STRING },
              email: { type: JSONSchemaType.STRING },
            },
            required: ['name'],
          },
        },
      };

      const fields = service.convertFromJSONSchema(schema);

      expect(fields[0].type).toBe(FieldType.OBJECT);
      expect(fields[0].children).toHaveLength(2);
      expect(fields[0].children![0].path).toBe('user.name');
      expect(
        fields[0].children!.find((c) => c.name === 'name')?.isRequired,
      ).toBe(true);
      expect(
        fields[0].children!.find((c) => c.name === 'email')?.isRequired,
      ).toBe(false);
    });

    it('should convert array schema with simple type', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          tags: {
            type: JSONSchemaType.ARRAY,
            items: { type: JSONSchemaType.STRING },
          },
        },
      };

      const fields = service.convertFromJSONSchema(schema);

      expect(fields[0].type).toBe(FieldType.ARRAY);
      expect(fields[0].arrayElementType).toBe(FieldType.STRING);
    });

    it('should convert array schema with object type', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          users: {
            type: JSONSchemaType.ARRAY,
            items: {
              type: JSONSchemaType.OBJECT,
              properties: {
                id: { type: JSONSchemaType.NUMBER },
                name: { type: JSONSchemaType.STRING },
              },
              required: ['id'],
            },
          },
        },
      };

      const fields = service.convertFromJSONSchema(schema);

      expect(fields[0].type).toBe(FieldType.ARRAY);
      expect(fields[0].arrayElementType).toBe(FieldType.OBJECT);
      expect(fields[0].children).toHaveLength(2);
      expect(fields[0].children![0].path).toBe('users.0.id');
      expect(fields[0].children!.find((c) => c.name === 'id')?.isRequired).toBe(
        true,
      );
    });

    it('should handle schema without required array', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          optional: { type: JSONSchemaType.STRING },
        },
      };

      const fields = service.convertFromJSONSchema(schema);

      expect(fields[0].isRequired).toBe(false);
    });

    it('should handle integer type as NUMBER', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          count: { type: 'integer' as JSONSchemaType },
        },
      };

      const fields = service.convertFromJSONSchema(schema);

      expect(fields[0].type).toBe(FieldType.NUMBER);
    });

    it('should handle date format as DATE type', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          birthdate: {
            type: JSONSchemaType.STRING,
            format: 'date' as JSONSchemaFormat,
          },
        },
      };

      const fields = service.convertFromJSONSchema(schema);

      expect(fields[0].type).toBe(FieldType.DATE);
    });

    it('should handle time format as DATE type', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          scheduleTime: {
            type: JSONSchemaType.STRING,
            format: 'time' as JSONSchemaFormat,
          },
        },
      };

      const fields = service.convertFromJSONSchema(schema);

      expect(fields[0].type).toBe(FieldType.DATE);
    });

    it('should throw error for non-object schema', () => {
      const schema = {
        type: 'string',
      } as any;

      expect(() => service.convertFromJSONSchema(schema)).toThrow(
        'JSON Schema must be of type "object" with properties',
      );
    });

    it('should throw error for schema without properties', () => {
      const schema = {
        type: 'object',
      } as any;

      expect(() => service.convertFromJSONSchema(schema)).toThrow(
        'JSON Schema must be of type "object" with properties',
      );
    });

    it('should handle property without type as STRING', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          noType: {} as JSONSchemaProperty,
        },
      };

      const fields = service.convertFromJSONSchema(schema);

      expect(fields[0].type).toBe(FieldType.STRING);
    });
  });

  describe('validateJSONSchema', () => {
    it('should validate correct object schema', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: JSONSchemaType.STRING },
        },
      };

      const result = service.validateJSONSchema(schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing schema object', () => {
      const result = service.validateJSONSchema(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema must be an object');
    });

    it('should detect non-object schema', () => {
      const result = service.validateJSONSchema('not an object');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema must be an object');
    });

    it('should detect missing type property', () => {
      const schema = { properties: {} };

      const result = service.validateJSONSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Schema must have a "type" property');
    });

    it('should detect object schema without properties', () => {
      const schema = { type: 'object' };

      const result = service.validateJSONSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Object schema must have "properties"');
    });

    it('should detect array schema without items', () => {
      const schema = { type: 'array' };

      const result = service.validateJSONSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Array schema must have "items"');
    });

    it('should handle multiple validation errors', () => {
      const schema = { type: 'object' }; // Missing properties

      const result = service.validateJSONSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('generateExampleFromSchema', () => {
    it('should generate example for simple types', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: JSONSchemaType.STRING },
          age: { type: JSONSchemaType.NUMBER },
          active: { type: JSONSchemaType.BOOLEAN },
        },
      };

      const example = service.generateExampleFromSchema(schema);

      expect(example.name).toBe('example');
      expect(example.age).toBe(0);
      expect(example.active).toBe(false);
    });

    it('should use examples property if available', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          name: { type: JSONSchemaType.STRING, examples: ['John Doe'] },
        },
      };

      const example = service.generateExampleFromSchema(schema);

      expect(example.name).toBe('John Doe');
    });

    it('should use default property if available', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          status: { type: JSONSchemaType.STRING, default: 'pending' },
        },
      };

      const example = service.generateExampleFromSchema(schema);

      expect(example.status).toBe('pending');
    });

    it('should generate date-time format example', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          timestamp: {
            type: JSONSchemaType.STRING,
            format: JSONSchemaFormat.DATE_TIME,
          },
        },
      };

      const example = service.generateExampleFromSchema(schema);

      expect(example.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should generate email format example', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          email: {
            type: JSONSchemaType.STRING,
            format: 'email' as JSONSchemaFormat,
          },
        },
      };

      const example = service.generateExampleFromSchema(schema);

      expect(example.email).toBe('example@example.com');
    });

    it('should generate uuid format example', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          id: {
            type: JSONSchemaType.STRING,
            format: 'uuid' as JSONSchemaFormat,
          },
        },
      };

      const example = service.generateExampleFromSchema(schema);

      expect(example.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should generate empty array for array type', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          tags: { type: JSONSchemaType.ARRAY },
        },
      };

      const example = service.generateExampleFromSchema(schema);

      expect(example.tags).toEqual([]);
    });

    it('should generate nested object example', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          user: {
            type: JSONSchemaType.OBJECT,
            properties: {
              name: { type: JSONSchemaType.STRING },
              age: { type: JSONSchemaType.NUMBER },
            },
          },
        },
      };

      const example = service.generateExampleFromSchema(schema);

      expect(example.user).toEqual({ name: 'example', age: 0 });
    });

    it('should return empty object for non-object schema', () => {
      const schema = {
        type: 'string',
      } as any;

      const example = service.generateExampleFromSchema(schema);

      expect(example).toEqual({});
    });

    it('should return empty object for schema without properties', () => {
      const schema: JSONSchema = {
        type: 'object',
      };

      const example = service.generateExampleFromSchema(schema);

      expect(example).toEqual({});
    });

    it('should handle unknown type as null', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          unknown: { type: 'unknown' as JSONSchemaType },
        },
      };

      const example = service.generateExampleFromSchema(schema);

      expect(example.unknown).toBeNull();
    });

    it('should prefer examples over default', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          value: {
            type: JSONSchemaType.STRING,
            examples: ['example1', 'example2'],
            default: 'default',
          },
        },
      };

      const example = service.generateExampleFromSchema(schema);

      expect(example.value).toBe('example1');
    });
  });

  describe('extractFieldName', () => {
    it('should extract field name from simple path', () => {
      const name = service['extractFieldName']('user.name', 'user');
      expect(name).toBe('name');
    });

    it('should extract field name from array path', () => {
      const name = service['extractFieldName']('users.0.id', 'users');
      expect(name).toBe('id');
    });

    it('should handle path without parent', () => {
      const name = service['extractFieldName']('root.nested.field');
      expect(name).toBe('field');
    });

    it('should skip numeric parts in array paths', () => {
      const name = service['extractFieldName']('items.0.value', 'items');
      expect(name).toBe('value');
    });

    it('should handle all-numeric parts edge case', () => {
      const name = service['extractFieldName']('items.0.1.2', 'items');
      expect(name).toBe('0');
    });

    it('should handle deep nested array paths', () => {
      const name = service['extractFieldName'](
        'root.items.0.nested.1.value',
        'root.items',
      );
      expect(name).toBe('nested');
    });
  });
});
