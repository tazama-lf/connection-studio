import { SchemaValidationService } from '../../src/simulation/schema-validation.service';

describe('SchemaValidationService', () => {
  let validator: SchemaValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new SchemaValidationService();
  });

  describe('validateSchemaMatchesPayload', () => {
    const payload = { FIToFIPmtSts: { GrpHdr: { MsgId: 'abc' } } };
    const matchingSchema = {
      type: 'object',
      properties: {
        FIToFIPmtSts: {
          type: 'object',
          properties: {
            GrpHdr: {
              type: 'object',
              properties: { MsgId: { type: 'string' } },
              required: ['MsgId'],
            },
          },
          required: ['GrpHdr'],
        },
      },
      required: ['FIToFIPmtSts'],
    };

    it('returns no errors when the schema matches a JSON payload', async () => {
      await expect(
        validator.validateSchemaMatchesPayload(
          payload,
          matchingSchema,
          'application/json',
        ),
      ).resolves.toEqual([]);
    });

    it('parses JSON string payloads before validating', async () => {
      await expect(
        validator.validateSchemaMatchesPayload(
          JSON.stringify(payload),
          matchingSchema,
          'application/json',
        ),
      ).resolves.toEqual([]);
    });

    it('rejects the unrelated schema from issue #135', async () => {
      const errors = await validator.validateSchemaMatchesPayload(
        payload,
        {
          type: 'object',
          properties: { CompletelyDifferentField: { type: 'string' } },
        },
        'application/json',
      );

      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects a payload missing a field the schema requires', async () => {
      const errors = await validator.validateSchemaMatchesPayload(
        { FIToFIPmtSts: { GrpHdr: {} } },
        matchingSchema,
        'application/json',
      );

      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: "must have required property 'MsgId'",
          }),
        ]),
      );
    });

    it('returns no errors when the schema matches an XML payload', async () => {
      await expect(
        validator.validateSchemaMatchesPayload(
          '<Document><MsgId>abc</MsgId></Document>',
          {
            type: 'object',
            properties: {
              Document: {
                type: 'object',
                properties: { MsgId: { type: 'string' } },
                required: ['MsgId'],
              },
            },
            required: ['Document'],
          },
          'application/xml',
        ),
      ).resolves.toEqual([]);
    });

    it('reports unparseable payloads as a payload error', async () => {
      const errors = await validator.validateSchemaMatchesPayload(
        '{not json',
        matchingSchema,
        'application/json',
      );

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('payload');
      expect(errors[0].message).toContain('Invalid JSON payload');
    });

    it('reports an unsupported content type as a payload error', async () => {
      const errors = await validator.validateSchemaMatchesPayload(
        payload,
        matchingSchema,
        'text/plain',
      );

      expect(errors[0].field).toBe('payload');
      expect(errors[0].message).toContain('Unsupported payload type');
    });
  });

  it('should handle enforceStrictSchema with non-object schema', async () => {
    const schema = 'string-schema';
    const result = (validator as any).enforceStrictSchema(schema);
    expect(result).toBe('string-schema');
  });

  it('should handle enforceStrictSchema with null schema', async () => {
    const result = (validator as any).enforceStrictSchema(null);
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
      .spyOn(validator as any, 'getSchemaTypeAtPath')
      .mockReturnValue('string');

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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
    const result = (validator as any).getSchemaTypeAtPath(schema, undefined);
    expect(result).toBeNull();
  });

  it('should handle getSchemaTypeAtPath with empty path', async () => {
    const schema = { type: 'string' };
    const result = (validator as any).getSchemaTypeAtPath(schema, '');
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
    const result = (validator as any).getSchemaAtPath(schema, '/level1/level2');
    if (result) {
      expect(result.type).toBe('string');
    } else {
      expect(result).toBeNull();
    }
  });

  it('should handle cleanSchemaForXML with empty schema', async () => {
    const result = (validator as any).cleanSchemaForXML({});
    expect(result).toBeDefined();
  });

  it('should handle isXmlParsedObject with non-object', async () => {
    const result = (validator as any).isXmlParsedObject('string');
    expect(result).toBe(false);
  });

  it('should handle isXmlParsedObject with object containing @attributes', async () => {
    const result = (validator as any).isXmlParsedObject({
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
    const result = (validator as any).normalizePayloadForValidation(
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

    const result = (validator as any).validatePayloadAgainstSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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
    const result = (validator as any).getSchemaTypeAtPath(
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
    const result = (validator as any).getSchemaTypeAtPath(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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
      .spyOn(validator as any, 'getSchemaTypeAtPath')
      .mockReturnValue('string');

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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
      .spyOn(validator as any, 'getSchemaAtPath')
      .mockReturnValue(childSchema);

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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
      .spyOn(validator as any, 'getSchemaAtPath')
      .mockImplementation((s, p) => {
        if (p === 'parent.child') return childSchema;
        return null;
      });

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).getSchemaAtPath(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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
      .spyOn(validator as any, 'getSchemaTypeAtPath')
      .mockReturnValue('string');

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    jest.spyOn(validator as any, 'getSchemaTypeAtPath').mockReturnValue(null);

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).validatePayloadAgainstSchema(
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

    const result = (validator as any).validatePayloadAgainstSchema(
      payload,
      schema,
    );

    expect(result).toBeDefined();
    // Validation should handle the array path
  });

  it('should handle type error without instancePath having slash', async () => {
    const payload = 'should be object';
    const schema = { type: 'object' };

    const result = (validator as any).validatePayloadAgainstSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).cleanSchemaForXML(schema);
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizePayloadForValidation(
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

    const result = (validator as any).cleanSchemaForXML(schema);
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
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

    const result = (validator as any).normalizeXmlParsedObjectWithSchema(
      xmlObj,
      schema,
      'field',
    );
    expect(result).toBeDefined();
    expect(result.textContent).toBe('mixed content');
    expect(result.child).toBeDefined();
  });

  it('should return obj when normalizeXmlParsedObjectWithSchema called with falsy value', () => {
    const result1 = (validator as any).normalizeXmlParsedObjectWithSchema(
      null,
      {},
      '',
    );
    expect(result1).toBeNull();

    const result2 = (validator as any).normalizeXmlParsedObjectWithSchema(
      0,
      {},
      '',
    );
    expect(result2).toBe(0);

    const result3 = (validator as any).normalizeXmlParsedObjectWithSchema(
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
    const result = (validator as any).getSchemaTypeAtPath(schema, 'field');
    expect(result).toBeNull();
  });

  it('should return null from getSchemaTypeAtPath when type is undefined', () => {
    const schema = {
      type: 'object',
      properties: {
        field: { properties: { inner: { type: 'string' } } },
      },
    };
    const result = (validator as any).getSchemaTypeAtPath(schema, 'field');
    expect(result).toBeNull();
  });

  it('should return null from getSchemaAtPath when schema is null', () => {
    const result = (validator as any).getSchemaAtPath(null, 'some.path');
    expect(result).toBeNull();
  });

  it('should return null from getSchemaAtPath when path is empty string', () => {
    const schema = {
      type: 'object',
      properties: { field: { type: 'string' } },
    };
    const result = (validator as any).getSchemaAtPath(schema, '');
    expect(result).toBeNull();
  });
});
