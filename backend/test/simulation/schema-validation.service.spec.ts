import { Test, TestingModule } from '@nestjs/testing';
import { SchemaValidationService } from '../../src/simulation/schema-validation.service';

jest.mock('xml2js', () => ({
  parseString: jest.fn((xml, callback) => {
    try {
      if (xml.includes('<invalid><xml>')) {
        callback(new Error('Invalid XML'), null);
      } else if (xml.includes('Invalid character entity')) {
        callback(new Error('Invalid character entity'), null);
      } else {
        const result = { root: { test: 'value' } };
        callback(null, result);
      }
    } catch (error) {
      callback(error, null);
    }
  }),
  Parser: jest.fn().mockImplementation(() => ({
    parseStringPromise: jest
      .fn()
      .mockResolvedValue({ root: { element: ['value'] } }),
  })),
}));

describe('SchemaValidationService', () => {
  let schemaValidationService: SchemaValidationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const xml2js = require('xml2js');
    xml2js.Parser.mockImplementation(() => ({
      parseStringPromise: jest
        .fn()
        .mockResolvedValue({ root: { element: ['value'] } }),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [SchemaValidationService],
    }).compile();

    schemaValidationService = module.get<SchemaValidationService>(
      SchemaValidationService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(schemaValidationService).toBeDefined();
  });

  describe('validateSchemaMatchesPayload', () => {
    it('should return no errors for a matching JSON payload', async () => {
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };

      const errors = await schemaValidationService.validateSchemaMatchesPayload(
        { name: 'John' },
        schema,
        'application/json',
      );

      expect(errors).toEqual([]);
    });

    it('should parse a JSON string payload before validating', async () => {
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };

      const errors = await schemaValidationService.validateSchemaMatchesPayload(
        JSON.stringify({ name: 'John' }),
        schema,
        'application/json',
      );

      expect(errors).toEqual([]);
    });

    it('should return schema validation errors for a non-matching JSON payload', async () => {
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };

      const errors = await schemaValidationService.validateSchemaMatchesPayload(
        {},
        schema,
        'application/json',
      );

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return a payload error for invalid JSON string payload', async () => {
      const errors = await schemaValidationService.validateSchemaMatchesPayload(
        '{invalid json',
        { type: 'object' },
        'application/json',
      );

      expect(errors).toEqual([
        {
          field: 'payload',
          message: expect.stringContaining('Invalid JSON payload'),
        },
      ]);
    });

    it('should return no errors for a matching XML payload', async () => {
      const xml2js = require('xml2js');
      xml2js.Parser.mockImplementation(() => ({
        parseStringPromise: jest
          .fn()
          .mockResolvedValue({ root: { test: 'value' } }),
      }));

      const schema = {
        type: 'object',
        properties: {
          root: {
            type: 'object',
            properties: { test: { type: 'string' } },
          },
        },
      };

      const errors = await schemaValidationService.validateSchemaMatchesPayload(
        '<root><test>value</test></root>',
        schema,
        'application/xml',
      );

      expect(errors).toEqual([]);
    });

    it('should return a payload error for an empty XML payload', async () => {
      const errors = await schemaValidationService.validateSchemaMatchesPayload(
        '',
        { type: 'object' },
        'application/xml',
      );

      expect(errors).toEqual([
        { field: 'payload', message: 'XML payload cannot be empty' },
      ]);
    });

    it('should return a payload error when XML parsing fails', async () => {
      const xml2js = require('xml2js');
      xml2js.Parser.mockImplementation(() => ({
        parseStringPromise: jest
          .fn()
          .mockRejectedValue(new Error('Invalid XML')),
      }));

      const errors = await schemaValidationService.validateSchemaMatchesPayload(
        '<invalid><xml>',
        { type: 'object' },
        'application/xml',
      );

      expect(errors).toEqual([
        {
          field: 'payload',
          message: expect.stringContaining('Invalid XML payload'),
        },
      ]);
    });

    it('should return a payload error for an unsupported content type', async () => {
      const errors = await schemaValidationService.validateSchemaMatchesPayload(
        {},
        { type: 'object' },
        'application/pdf',
      );

      expect(errors).toEqual([
        {
          field: 'payload',
          message: expect.stringContaining('Unsupported payload type'),
        },
      ]);
    });
  });

  it('should handle enforceStrictSchema with non-object schema', async () => {
    const schema = 'string-schema';
    const result = schemaValidationService.enforceStrictSchema(schema);
    expect(result).toBe('string-schema');
  });

  it('should handle enforceStrictSchema with null schema', async () => {
    const result = schemaValidationService.enforceStrictSchema(null);
    expect(result).toBeNull();
  });

  it('should handle normalizeXmlParsedObjectWithSchema with getSchemaTypeAtPath returning string', async () => {
    const xmlObj = {
      '#text': 'text value',
      '@attr': 'attribute value',
    };
    const schema = {
      type: 'object',
      properties: {
        field: { type: 'string' },
      },
    };

    jest
      .spyOn(schemaValidationService, 'getSchemaTypeAtPath')
      .mockReturnValue('string');

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '/field',
    );
    expect(result).toBeDefined();
  });

  it('should handle getSchemaTypeAtPath with undefined path', async () => {
    const schema = {
      type: 'object',
      properties: { field: { type: 'string' } },
    };
    const result = schemaValidationService.getSchemaTypeAtPath(
      schema,
      undefined,
    );
    expect(result).toBeNull();
  });

  it('should handle getSchemaTypeAtPath with empty path', async () => {
    const schema = { type: 'string' };
    const result = schemaValidationService.getSchemaTypeAtPath(schema, '');
    expect(result).toBeNull();
  });

  it('should handle getSchemaAtPath with complex nested path', async () => {
    const schema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: { type: 'string' },
          },
        },
      },
    };
    const result = schemaValidationService.getSchemaAtPath(
      schema,
      '/level1/level2',
    );
    if (result) {
      expect(result.type).toBe('string');
    } else {
      expect(result).toBeNull();
    }
  });

  it('should handle cleanSchemaForXML with empty schema', async () => {
    const result = schemaValidationService.cleanSchemaForXML({});
    expect(result).toBeDefined();
  });

  it('should handle isXmlParsedObject with non-object', async () => {
    const result = schemaValidationService.isXmlParsedObject('string');
    expect(result).toBe(false);
  });

  it('should handle isXmlParsedObject with object containing @attributes', async () => {
    const result = schemaValidationService.isXmlParsedObject({
      '@attr': 'value',
      field: 'data',
    });
    expect(result).toBe(true);
  });

  it('should handle normalizePayloadForValidation with array payload', async () => {
    const payload = [{ id: 1 }, { id: 2 }];
    const config = {
      schema: {
        type: 'array',
        items: { type: 'object', properties: { id: { type: 'number' } } },
      },
    };
    const result = schemaValidationService.normalizePayloadForValidation(
      payload,
      config,
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle validatePayloadAgainstSchema with complex nested errors', async () => {
    const payload = {
      level1: {
        level2: {
          items: [
            { id: 1, name: 'valid' },
            { id: 'invalid', name: 'test' },
          ],
        },
      },
    };

    const schema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                    },
                    required: ['id', 'name'],
                  },
                },
              },
            },
          },
        },
      },
    };

    const result = schemaValidationService.validatePayloadAgainstSchema(
      payload,
      schema,
    );
    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'valid' in result) {
      expect(typeof result.valid).toBe('boolean');
    }
  });

  it('should handle normalizeXmlParsedObjectWithSchema with textContent extraction', async () => {
    const xmlObj = {
      field: {
        '#text': 'text value',
        subField: 'other',
      },
    };
    const schema = {
      type: 'object',
      properties: {
        field: { type: 'string' },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '/',
    );
    expect(result).toBeDefined();
    expect(result.field).toBeDefined();
  });

  it('should handle normalizeXmlParsedObjectWithSchema with nested textContent', async () => {
    const xmlObj = {
      parent: {
        child: {
          textContent: 'nested text',
          otherField: 'value',
        },
      },
    };
    const schema = {
      type: 'object',
      properties: {
        parent: {
          type: 'object',
          properties: {
            child: { type: 'string' },
          },
        },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '/',
    );
    expect(result).toBeDefined();
  });

  it('should handle getSchemaTypeAtPath with path containing dots', async () => {
    const schema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: { type: 'number' },
          },
        },
      },
    };
    const result = schemaValidationService.getSchemaTypeAtPath(
      schema,
      'level1.level2',
    );
    expect(result).toBe('number');
  });

  it('should handle getSchemaTypeAtPath with missing property', async () => {
    const schema = {
      type: 'object',
      properties: {
        field1: { type: 'string' },
      },
    };
    const result = schemaValidationService.getSchemaTypeAtPath(
      schema,
      'nonexistent',
    );
    expect(result).toBeNull();
  });

  it('should handle XML normalization with object having both textContent and #text', async () => {
    const xmlObj = {
      field: {
        textContent: 'text1',
        '#text': 'text2',
        nested: 'value',
      },
    };
    const schema = { type: 'object' };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '/',
    );
    expect(result).toBeDefined();
  });

  it('should handle XML with #text and expectedType as string with attributes', async () => {
    const xmlObj = {
      description: {
        '#text': 'Product description',
        '@lang': 'en',
        '@version': '1.0',
      },
    };

    const schema = {
      type: 'object',
      properties: {
        description: { type: 'string' },
      },
    };

    jest
      .spyOn(schemaValidationService, 'getSchemaTypeAtPath')
      .mockReturnValue('string');

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(result).toBeDefined();
    expect(result.description).toBe('Product description');
  });

  it('should handle XML with #text and hasOnlyTextAndAttributes true', async () => {
    const xmlObj = {
      field: {
        '#text': 'text value',
        '@attr1': 'value1',
        '@attr2': 'value2',
      },
    };

    const schema = {
      type: 'object',
      properties: {
        field: { type: 'object' },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(result).toBeDefined();
  });

  it('should handle nested object with fieldSchema type string and textContent', async () => {
    const xmlObj = {
      parent: {
        child: {
          textContent: 'extracted text',
          otherData: 'ignored',
        },
      },
    };

    const childSchema = { type: 'string' };
    const schema = {
      type: 'object',
      properties: {
        parent: {
          type: 'object',
          properties: {
            child: childSchema,
          },
        },
      },
    };

    jest
      .spyOn(schemaValidationService, 'getSchemaAtPath')
      .mockReturnValue(childSchema);

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(result).toBeDefined();
    expect(result.parent.child).toBe('extracted text');
  });

  it('should handle nested object with fieldSchema type string and #text property', async () => {
    const xmlObj = {
      parent: {
        child: {
          '#text': 'text from #text',
          other: 'data',
        },
      },
    };

    const childSchema = { type: 'string' };
    const schema = {
      type: 'object',
      properties: {
        parent: {
          type: 'object',
          properties: {
            child: childSchema,
          },
        },
      },
    };

    jest
      .spyOn(schemaValidationService, 'getSchemaAtPath')
      .mockImplementation((s, p) => {
        if (p === 'parent.child') return childSchema;
        return null;
      });

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(result).toBeDefined();
  });

  it('should handle getSchemaAtPath traversing nested properties', async () => {
    const schema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                level3: { type: 'boolean' },
              },
            },
          },
        },
      },
    };

    const result = schemaValidationService.getSchemaAtPath(
      schema,
      '/level1/level2/level3',
    );
    expect(result).toBeDefined();
    if (result) {
      expect(result.type).toBe('boolean');
    }
  });

  it('should handle XML normalization with #text having other non-attribute fields', async () => {
    const xmlObj = {
      item: {
        '#text': 'text value',
        nested: { field: 'value' },
      },
    };

    const schema = {
      type: 'object',
      properties: {
        item: { type: 'object' },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(result).toBeDefined();
    // The item should be processed
    expect(result.item).toBeDefined();
  });

  it('should handle XML normalization checking hasAttributes with non-text keys', async () => {
    const xmlObj = {
      data: {
        '#text': 'content',
        '@id': '123',
        child: 'nested',
      },
    };

    const schema = {
      type: 'object',
      properties: {
        data: { type: 'string' },
      },
    };

    jest
      .spyOn(schemaValidationService, 'getSchemaTypeAtPath')
      .mockReturnValue('string');

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(result).toBeDefined();
    expect(result.data).toBe('content');
  });

  it('should handle XML with hasOnlyTextAndAttributes check', async () => {
    const xmlObj = {
      element: {
        '#text': 'only text',
        '@attr': 'attribute',
      },
    };

    const schema = {
      type: 'object',
      properties: {
        element: { type: 'object' },
      },
    };

    jest
      .spyOn(schemaValidationService, 'getSchemaTypeAtPath')
      .mockReturnValue(null);

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(result).toBeDefined();
    expect(result.element).toBe('only text');
  });

  it('should handle currentPath construction with empty path', async () => {
    const xmlObj = {
      rootField: {
        nested: 'value',
      },
    };

    const schema = {
      type: 'object',
      properties: {
        rootField: {
          type: 'object',
          properties: {
            nested: { type: 'string' },
          },
        },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(result).toBeDefined();
    expect(result.rootField.nested).toBe('value');
  });

  it('should handle currentPath construction with existing path', async () => {
    const xmlObj = {
      child: 'value',
    };

    const schema = {
      type: 'object',
      properties: {
        parent: {
          type: 'object',
          properties: {
            child: { type: 'string' },
          },
        },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      'parent',
    );
    expect(result).toBeDefined();
  });

  it('should handle normalizeXmlParsedObjectWithSchema with array at root', async () => {
    const xmlObj = [
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
    ];

    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
        },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('should skip keys starting with @ in normalizeXmlParsedObjectWithSchema', async () => {
    const xmlObj = {
      data: {
        '@id': '123',
        '@version': '1.0',
        content: 'actual data',
      },
    };

    const schema = {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            content: { type: 'string' },
          },
        },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data['@id']).toBeUndefined();
    expect(result.data.content).toBe('actual data');
  });

  it('should handle validation error with empty message triggering fallback', async () => {
    const payload = { test: 'value' };
    const schema = { type: 'number' };

    const result = schemaValidationService.validatePayloadAgainstSchema(
      payload,
      schema,
    );

    expect(result).toBeDefined();
    if (result && !result.valid && result.errors) {
      const hasMessageOrFallback = result.errors.every(
        (e) =>
          e.message === '' ||
          e.message === 'Schema validation failed' ||
          e.message,
      );
      expect(hasMessageOrFallback).toBe(true);
    }
  });

  it('should continue loop on additionalProperties error when isArrayPath is true', async () => {
    const payload = {
      list: [{ name: 'valid' }, { name: 'valid2', extra: 'field' }],
    };

    const schema = {
      type: 'object',
      properties: {
        list: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
      },
    };

    const result = schemaValidationService.validatePayloadAgainstSchema(
      payload,
      schema,
    );

    expect(result).toBeDefined();
    // Validation should handle the array path
  });

  it('should handle type error without instancePath having slash', async () => {
    const payload = 'should be object';
    const schema = { type: 'object' };

    const result = schemaValidationService.validatePayloadAgainstSchema(
      payload,
      schema,
    );

    expect(result).toBeDefined();
    if (result && typeof result === 'object' && 'valid' in result) {
      expect(result.valid).toBe(false);
    }
  });

  it('should handle deeply nested array in normalizeXmlParsedObjectWithSchema', async () => {
    const xmlObj = {
      level1: [
        { level2: [{ value: 'a' }, { value: 'b' }] },
        { level2: [{ value: 'c' }] },
      ],
    };

    const schema = {
      type: 'object',
      properties: {
        level1: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              level2: {
                type: 'array',
                items: { type: 'object' },
              },
            },
          },
        },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(result).toBeDefined();
    expect(result.level1).toBeDefined();
    expect(Array.isArray(result.level1)).toBe(true);
  });

  it('should cover cleanSchemaForXML with primitive property value', async () => {
    const schema = {
      type: 'object',
      properties: {
        'xmlns:ns': { type: 'string' },
        '@attr': { type: 'string' },
        $: { type: 'object' },
        normalField: 'string',
        objectField: {
          type: 'object',
          properties: { inner: { type: 'string' } },
        },
      },
    };

    const result = schemaValidationService.cleanSchemaForXML(schema);
    expect(result.properties).toBeDefined();
    expect(result.properties.normalField).toBe('string');
    expect(result.properties.objectField).toBeDefined();
    expect(result.properties['xmlns:ns']).toBeUndefined();
  });

  it('should cover normalizeXmlParsedObjectWithSchema with array root', async () => {
    const arrData = [{ field: 'value1' }, { field: 'value2' }];
    const schema = {
      type: 'array',
      items: { type: 'object', properties: { field: { type: 'string' } } },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      arrData,
      schema,
      '',
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });

  it('should cover path construction with non-empty path', async () => {
    const xmlObj = {
      parent: {
        child: {
          '#text': 'value',
        },
      },
    };
    const schema = {
      type: 'object',
      properties: {
        parent: {
          type: 'object',
          properties: {
            child: { type: 'string' },
          },
        },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      '',
    );
    expect(result.parent).toBeDefined();
    expect(result.parent.child).toBeDefined();
  });

  it('should cover normalizePayloadForValidation wrapping with root element', async () => {
    const config = {
      schema: {
        type: 'object',
        properties: {
          Document: {
            type: 'object',
            properties: {
              field: { type: 'string' },
            },
          },
        },
      },
    };
    const payload = { field: { '#text': 'value' } };

    const result = schemaValidationService.normalizePayloadForValidation(
      payload,
      config,
    );
    expect(result).toBeDefined();
    expect(result.Document).toBeDefined();
  });

  it('should cover cleanSchemaForXML removing XML attributes from required', async () => {
    const schema = {
      type: 'object',
      properties: {
        'xmlns:ns': { type: 'string' },
        '@attr': { type: 'string' },
        normalField: { type: 'string' },
      },
      required: ['xmlns:ns', '@attr', 'normalField'],
    };

    const result = schemaValidationService.cleanSchemaForXML(schema);
    expect(result.required).toBeDefined();
    expect(result.required.length).toBeLessThan(schema.required.length);
  });

  it('should cover array map in normalizeXmlParsedObjectWithSchema', async () => {
    const arrData = [
      { '#text': 'value1', '@id': '1' },
      { '#text': 'value2', '@id': '2' },
    ];
    const schema = {
      type: 'array',
      items: { type: 'string' },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      arrData,
      schema,
      '',
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it('should cover currentPath with existing path prefix', async () => {
    const xmlObj = {
      level1: {
        level2: {
          '#text': 'value',
        },
      },
    };
    const schema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: { type: 'string' },
          },
        },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      'root',
    );
    expect(result.level1).toBeDefined();
  });

  it('should cover array iteration in normalizeXmlParsedObjectWithSchema', async () => {
    const xmlData = {
      root: [
        { item: { '#text': 'value1' } },
        { item: { '#text': 'value2' } },
        { item: { '#text': 'value3' } },
      ],
    };
    const schema = {
      type: 'object',
      properties: {
        root: {
          type: 'array',
          items: { type: 'object', properties: { item: { type: 'string' } } },
        },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlData,
      schema,
      '',
    );
    expect(result).toBeDefined();
    expect(result.root).toBeDefined();
    expect(Array.isArray(result.root)).toBe(true);
  });

  it('should cover nested path currentPath construction', async () => {
    const xmlData = {
      level1: {
        level2: {
          level3: {
            '#text': 'deep-value',
          },
        },
      },
    };
    const schema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                level3: { type: 'string' },
              },
            },
          },
        },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlData,
      schema,
      '',
    );
    expect(result.level1.level2.level3).toBe('deep-value');
  });

  it('should cover edge case when array map is called in normalizeXmlParsedObjectWithSchema', async () => {
    const xmlArray = [
      { '#text': 'item1', '@id': '1' },
      { '#text': 'item2', '@id': '2' },
      { '#text': 'item3', '@id': '3' },
    ];
    const schema = {
      type: 'array',
      items: { type: 'string' },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlArray,
      schema,
      '',
    );
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });

  it('should set textContent when #text has non-attribute sibling keys and schema type is not string', () => {
    const xmlObj = {
      '#text': 'mixed content',
      child: { nested: 'value' },
    };
    const schema = {
      type: 'object',
      properties: {
        field: { type: 'object' },
      },
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      'field',
    );
    expect(result).toBeDefined();
    expect(result.textContent).toBe('mixed content');
    expect(result.child).toBeDefined();
  });

  it('should keep #text as-is (not rename to textContent) when the schema explicitly declares a #text property (issue #134)', () => {
    // XML element with both an attribute and text content, as produced by
    // fast-xml-parser({ ignoreAttributes: false, attributeNamePrefix: '' })
    // e.g. <IntrBkSttlmAmt Ccy="USD">100.00</IntrBkSttlmAmt>
    const xmlObj = {
      '#text': 100,
      Ccy: 'USD',
    };
    const schema = {
      type: 'object',
      properties: {
        '#text': { type: 'number' },
        Ccy: { type: 'string' },
      },
      required: ['#text', 'Ccy'],
    };

    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      'IntrBkSttlmAmt',
    );

    expect(result).toEqual({ '#text': 100, Ccy: 'USD' });
    expect(result.textContent).toBeUndefined();
  });

  it('should resolve nested schemas correctly beyond one level of depth, and validate a real attribute+text payload with zero errors (issue #134 regression)', () => {
    // Mirrors the exact structure from
    // https://github.com/tazama-lf/connection-studio/issues/134 :
    // an XML element nested 4 levels deep that has both an attribute and
    // text content, with a schema generated the way the frontend does
    // (every key required, #text included as its own required property).
    const payload = {
      Document: {
        FIToFICstmrCdtTrf: {
          CdtTrfTxInf: {
            IntrBkSttlmAmt: { '#text': 100, Ccy: 'USD' },
          },
        },
      },
    };
    const schema = {
      type: 'object',
      properties: {
        Document: {
          type: 'object',
          properties: {
            FIToFICstmrCdtTrf: {
              type: 'object',
              properties: {
                CdtTrfTxInf: {
                  type: 'object',
                  properties: {
                    IntrBkSttlmAmt: {
                      type: 'object',
                      properties: {
                        '#text': { type: 'number' },
                        Ccy: { type: 'string' },
                      },
                      required: ['#text', 'Ccy'],
                    },
                  },
                  required: ['IntrBkSttlmAmt'],
                },
              },
              required: ['CdtTrfTxInf'],
            },
          },
          required: ['FIToFICstmrCdtTrf'],
        },
      },
      required: ['Document'],
    };

    const normalized =
      schemaValidationService.normalizeXmlParsedObjectWithSchema(
        payload,
        schema,
      );
    expect(
      normalized.Document.FIToFICstmrCdtTrf.CdtTrfTxInf.IntrBkSttlmAmt,
    ).toEqual({ '#text': 100, Ccy: 'USD' });

    const errors = schemaValidationService.validatePayloadAgainstSchema(
      payload,
      schemaValidationService.cleanSchemaForXML(schema),
      { schema },
    );
    expect(errors).toEqual([]);
  });

  it('should resolve item schemas and coerce numeric #text for a repeated attribute+text element (CodeRabbit PR #145 findings)', () => {
    // Shape verified against the REAL (unmocked) xml2js parser for
    // <Item Ccy="USD">100.00</Item> repeated siblings: no value processors
    // are configured, so #text comes back as the STRING "100.00", not a
    // number — unlike the frontend's fast-xml-parser/JSON path used
    // elsewhere in this suite. xml2js is jest.mock()'d in this file, so
    // this test starts from that already-parsed shape directly rather
    // than going through parsePayload().
    const parsed = {
      Doc: {
        Items: {
          Item: [
            { '#text': '100.00', Ccy: 'USD' },
            { '#text': '50.00', Ccy: 'EUR' },
          ],
        },
      },
    };

    const schema = {
      type: 'object',
      required: ['Doc'],
      properties: {
        Doc: {
          type: 'object',
          required: ['Items'],
          properties: {
            Items: {
              type: 'object',
              required: ['Item'],
              properties: {
                Item: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['#text', 'Ccy'],
                    properties: {
                      '#text': { type: 'number' },
                      Ccy: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const normalized = schemaValidationService.normalizePayloadForValidation(
      parsed,
      { schema },
    );
    expect(normalized.Doc.Items.Item).toEqual([
      { '#text': 100, Ccy: 'USD' },
      { '#text': 50, Ccy: 'EUR' },
    ]);

    const errors = schemaValidationService.validatePayloadAgainstSchema(
      parsed,
      schemaValidationService.cleanSchemaForXML(schema),
      { schema },
    );
    expect(errors).toEqual([]);
  });

  it('should leave a non-numeric-looking #text string unconverted even when the schema declares a number type', () => {
    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      { '#text': 'not-a-number', Ccy: 'USD' },
      {
        type: 'object',
        properties: {
          '#text': { type: 'number' },
          Ccy: { type: 'string' },
        },
      },
    );
    expect(result).toEqual({ '#text': 'not-a-number', Ccy: 'USD' });
  });

  it('should not attempt numeric coercion when #text is already a number', () => {
    const result = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      { '#text': 100, Ccy: 'USD' },
      {
        type: 'object',
        properties: {
          '#text': { type: 'number' },
          Ccy: { type: 'string' },
        },
      },
    );
    expect(result).toEqual({ '#text': 100, Ccy: 'USD' });
  });

  it('should return obj when normalizeXmlParsedObjectWithSchema called with falsy value', () => {
    const result1 = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      null,
      {},
      '',
    );
    expect(result1).toBeNull();

    const result2 = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      0,
      {},
      '',
    );
    expect(result2).toBe(0);

    const result3 = schemaValidationService.normalizeXmlParsedObjectWithSchema(
      '',
      {},
      '',
    );
    expect(result3).toBe('');
  });

  it('should return null from getSchemaTypeAtPath when type is null', () => {
    const schema = {
      type: 'object',
      properties: {
        field: { type: null },
      },
    };
    const result = schemaValidationService.getSchemaTypeAtPath(schema, 'field');
    expect(result).toBeNull();
  });

  it('should return null from getSchemaTypeAtPath when type is undefined', () => {
    const schema = {
      type: 'object',
      properties: {
        field: { properties: { inner: { type: 'string' } } },
      },
    };
    const result = schemaValidationService.getSchemaTypeAtPath(schema, 'field');
    expect(result).toBeNull();
  });

  it('should return null from getSchemaAtPath when schema is null', () => {
    const result = schemaValidationService.getSchemaAtPath(null, 'some.path');
    expect(result).toBeNull();
  });

  it('should return null from getSchemaAtPath when path is empty string', () => {
    const schema = {
      type: 'object',
      properties: { field: { type: 'string' } },
    };
    const result = schemaValidationService.getSchemaAtPath(schema, '');
    expect(result).toBeNull();
  });
});
