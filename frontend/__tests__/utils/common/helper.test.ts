import {
  capitalizeFirstLetter,
  convertSchemaFieldsToInferredFields,
  convertSchemaToFields,
  generateJSONSchema,
  generateSchemaFromPayload,
  safeJsonParse,
  validateEventType,
  validateInput,
  validatePayloadContent,
  validateTransactionType,
  validateVersion,
} from '../../../src/utils/common/helper';

describe('utils/common/helper.ts', () => {
  it('module loads', async () => {
    await expect(import('@/utils/common/helper')).resolves.toBeDefined();
  });

  // ── capitalizeFirstLetter ──
  describe('capitalizeFirstLetter', () => {
    it('capitalizes first char and lowercases rest', () => {
      expect(capitalizeFirstLetter('hELLO')).toBe('Hello');
      expect(capitalizeFirstLetter('a')).toBe('A');
      expect(capitalizeFirstLetter('')).toBe('');
    });
  });

  // ── generateJSONSchema ──
  describe('generateJSONSchema', () => {
    it('returns empty array for non-object input', () => {
      expect(generateJSONSchema(null)).toEqual([]);
      expect(generateJSONSchema(undefined)).toEqual([]);
      expect(generateJSONSchema([1, 2])).toEqual([]);
      expect(generateJSONSchema('str')).toEqual([]);
    });

    it('generates schema for primitives', () => {
      const schema = generateJSONSchema({ a: 1, b: 'x', c: true });
      expect(schema).toHaveLength(3);
      expect(schema[0]).toMatchObject({
        name: 'a',
        type: 'number',
        isRequired: true,
      });
      expect(schema[1]).toMatchObject({ name: 'b', type: 'string' });
      expect(schema[2]).toMatchObject({ name: 'c', type: 'boolean' });
    });

    it('generates schema for nested objects', () => {
      const schema = generateJSONSchema({ user: { name: 'sam' } });
      expect(schema[0]).toMatchObject({ name: 'user', type: 'object' });
      expect(schema[0].children).toHaveLength(1);
      expect(schema[0].children![0]).toMatchObject({
        path: 'user.name',
        type: 'string',
      });
    });

    it('generates schema for array of objects', () => {
      const schema = generateJSONSchema({ users: [{ id: 1 }] });
      expect(schema[0]).toMatchObject({
        type: 'array',
        arrayElementType: 'object',
      });
      expect(schema[0].path).toBe('users[0]');
      expect(schema[0].children![0]).toMatchObject({ path: 'users[0].id' });
    });

    it('generates schema for array of arrays', () => {
      const schema = generateJSONSchema({ matrix: [[1, 2]] });
      expect(schema[0]).toMatchObject({
        type: 'array',
        arrayElementType: 'array',
      });
      expect(schema[0].children).toEqual([]);
    });

    it('generates schema for array of primitives', () => {
      const schema = generateJSONSchema({ tags: ['a', 'b'] });
      expect(schema[0]).toMatchObject({
        type: 'array',
        arrayElementType: 'string',
      });
    });

    it('generates schema for empty array (no arrayElementType)', () => {
      const schema = generateJSONSchema({ items: [] });
      expect(schema[0]).toMatchObject({ name: 'items', type: 'array' });
      expect(schema[0].arrayElementType).toBeUndefined();
    });

    it('uses path prefix for nested fields', () => {
      const schema = generateJSONSchema({ name: 'x' }, 'parent');
      expect(schema[0].path).toBe('parent.name');
    });
  });

  // ── convertSchemaFieldsToInferredFields ──
  describe('convertSchemaFieldsToInferredFields', () => {
    it('converts flat fields', () => {
      const result = convertSchemaFieldsToInferredFields([
        { name: 'a', path: 'a', type: 'string', isRequired: true },
      ]);
      expect(result).toEqual([
        {
          path: 'a',
          type: 'String',
          level: 0,
          parent: undefined,
          required: true,
        },
      ]);
    });

    it('converts nested fields with parent and level', () => {
      const result = convertSchemaFieldsToInferredFields([
        {
          name: 'user',
          path: 'user',
          type: 'object',
          isRequired: true,
          children: [
            {
              name: 'name',
              path: 'user.name',
              type: 'string',
              isRequired: true,
            },
          ],
        },
      ]);
      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({
        path: 'user.name',
        level: 1,
        parent: 'user',
      });
    });

    it('handles .0. array parent paths', () => {
      const result = convertSchemaFieldsToInferredFields([
        {
          name: 'items',
          path: 'items',
          type: 'array',
          isRequired: true,
          children: [
            {
              name: 'id',
              path: 'items.0.id',
              type: 'number',
              isRequired: true,
            },
          ],
        },
      ]);
      expect(result[1]).toMatchObject({
        path: 'items.0.id',
        parent: 'items.0',
      });
    });

    it('skips empty children', () => {
      const result = convertSchemaFieldsToInferredFields([
        {
          name: 'a',
          path: 'a',
          type: 'string',
          isRequired: true,
          children: [],
        },
      ]);
      expect(result).toHaveLength(1);
    });
  });

  // ── convertSchemaToFields ──
  describe('convertSchemaToFields', () => {
    it('converts flat schema fields', () => {
      const result = convertSchemaToFields([
        { name: 'a', path: 'a', type: 'string', isRequired: true },
      ]);
      expect(result).toEqual([
        {
          path: 'a',
          type: 'String',
          level: 0,
          parent: undefined,
          required: true,
        },
      ]);
    });

    it('converts nested schema with children and payload', () => {
      const result = convertSchemaToFields(
        [
          {
            name: 'user',
            path: 'user',
            type: 'object',
            isRequired: true,
            children: [
              {
                name: 'name',
                path: 'user.name',
                type: 'string',
                isRequired: true,
              },
            ],
          },
        ],
        { user: { name: 'sam' } },
      );
      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({
        path: 'user.name',
        level: 1,
        parent: 'user',
      });
    });

    it('handles array fields with payload', () => {
      const result = convertSchemaToFields(
        [
          {
            name: 'items',
            path: 'items',
            type: 'array',
            isRequired: true,
            children: [
              {
                name: 'id',
                path: 'items.id',
                type: 'number',
                isRequired: true,
              },
            ],
          },
        ],
        { items: [{ id: 1 }, { id: 2 }] },
      );
      expect(result.some((f) => f.path === 'items[0]')).toBe(true);
      expect(result.some((f) => f.path === 'items[1]')).toBe(true);
      // child paths are rewritten with the array index
      expect(
        result.some((f) => f.path === 'items[0].id' && f.parent === 'items[0]'),
      ).toBe(true);
      expect(
        result.some((f) => f.path === 'items[1].id' && f.parent === 'items[1]'),
      ).toBe(true);
    });

    it('handles array field with parentPath', () => {
      const result = convertSchemaToFields(
        [
          {
            name: 'tags',
            path: 'tags',
            type: 'array',
            isRequired: true,
          },
        ],
        { tags: ['a', 'b'] },
        0,
        'root',
      );
      expect(result[0]).toMatchObject({ parent: 'root' });
    });

    it('handles nested path with dots for parent computation', () => {
      const result = convertSchemaToFields([
        { name: 'name', path: 'user.name', type: 'string', isRequired: true },
      ]);
      expect(result[0]).toMatchObject({ parent: 'user' });
    });
  });

  // ── generateSchemaFromPayload ──
  describe('generateSchemaFromPayload', () => {
    it('generates schema from JSON string', () => {
      const schema = generateSchemaFromPayload('{"a":1}', 'application/json');
      expect(schema).toHaveLength(1);
      expect(schema![0]).toMatchObject({ name: 'a', type: 'number' });
    });

    it('generates schema from JSON object', () => {
      const schema = generateSchemaFromPayload({ a: 1 }, 'application/json');
      expect(schema![0]).toMatchObject({ name: 'a' });
    });

    it('throws on invalid JSON string', () => {
      expect(() =>
        generateSchemaFromPayload('{bad', 'application/json'),
      ).toThrow('Invalid JSON format');
    });

    it('throws on JSON array (not a record)', () => {
      expect(() =>
        generateSchemaFromPayload('[1,2]', 'application/json'),
      ).toThrow('Invalid JSON format');
    });

    it('throws on non-record JSON object payload', () => {
      expect(() =>
        generateSchemaFromPayload([1, 2], 'application/json'),
      ).toThrow('Invalid JSON format');
    });

    it('generates schema from valid XML string', () => {
      const schema = generateSchemaFromPayload(
        '<root><item>test</item></root>',
        'application/xml',
      );
      expect(schema).toHaveLength(1);
    });

    it('throws on non-string XML payload', () => {
      expect(() =>
        generateSchemaFromPayload({ a: 1 }, 'application/xml'),
      ).toThrow('Invalid XML format');
    });

    it('throws on invalid XML string (XMLParser throws)', () => {
      // "<" causes XMLParser.parse to throw internally
      expect(() => generateSchemaFromPayload('<', 'application/xml')).toThrow(
        'Invalid XML format',
      );
    });

    it('returns null for unsupported content type', () => {
      expect(generateSchemaFromPayload('text', 'text/plain')).toBeNull();
    });
  });

  // ── validateTransactionType / validateVersion / validateEventType ──
  describe('validateTransactionType', () => {
    it('returns empty string for valid type', () => {
      expect(validateTransactionType('pacs_008')).toBe('');
    });

    it('returns error for invalid type', () => {
      expect(validateTransactionType('')).not.toBe('');
      expect(validateTransactionType('BadType')).not.toBe('');
    });
  });

  describe('validateVersion', () => {
    it('returns empty string for valid version', () => {
      expect(validateVersion('1.0.0')).toBe('');
      expect(validateVersion('v1.0.0')).toBe('');
    });

    it('returns error for invalid version', () => {
      expect(validateVersion('')).not.toBe('');
      expect(validateVersion('1.0')).not.toBe('');
    });
  });

  describe('validateEventType', () => {
    it('returns empty string for valid or empty event type', () => {
      expect(validateEventType('')).toBe('');
      expect(validateEventType('iso-20022')).toBe('');
    });

    it('returns error for invalid event type', () => {
      expect(validateEventType('/bad')).not.toBe('');
    });
  });

  // ── validatePayloadContent ──
  describe('validatePayloadContent', () => {
    it('returns required error for null/undefined/empty', () => {
      expect(validatePayloadContent(null, 'application/json')).toMatchObject({
        isValid: false,
        message: 'Payload is required',
      });
      expect(
        validatePayloadContent(undefined, 'application/json'),
      ).toMatchObject({
        message: 'Payload is required',
      });
      expect(validatePayloadContent('', 'application/json')).toMatchObject({
        message: 'Payload is required',
      });
    });

    it('validates JSON string', () => {
      expect(
        validatePayloadContent('{"a":1}', 'application/json'),
      ).toMatchObject({
        isValid: true,
        message: 'Valid JSON format detected',
      });
    });

    it('returns error for invalid JSON string', () => {
      expect(validatePayloadContent('{bad', 'application/json')).toMatchObject({
        isValid: false,
        message: 'Invalid JSON format',
      });
    });

    it('returns error for JSON array string', () => {
      expect(validatePayloadContent('[1,2]', 'application/json')).toMatchObject(
        {
          isValid: false,
        },
      );
    });

    it('validates JSON object', () => {
      expect(
        validatePayloadContent({ a: 1 }, 'application/json'),
      ).toMatchObject({
        isValid: true,
      });
    });

    it('returns error for JSON array object', () => {
      expect(validatePayloadContent([1, 2], 'application/json')).toMatchObject({
        isValid: false,
      });
    });

    it('returns error for non-object JSON (number)', () => {
      expect(validatePayloadContent(42, 'application/json')).toMatchObject({
        isValid: false,
      });
    });

    it('returns error for non-string XML payload', () => {
      expect(validatePayloadContent({ a: 1 }, 'application/xml')).toMatchObject(
        {
          isValid: false,
          message: 'Invalid XML format',
        },
      );
    });

    it('validates valid XML string', () => {
      expect(
        validatePayloadContent(
          '<root><item>1</item></root>',
          'application/xml',
        ),
      ).toMatchObject({ isValid: true });
    });

    it('returns error for malformed XML (parsererror)', () => {
      expect(
        validatePayloadContent('<root><unclosed>', 'application/xml'),
      ).toMatchObject({ isValid: false });
    });

    it('returns error for XML with declaration (validateInput fails)', () => {
      expect(
        validatePayloadContent(
          '<?xml version="1.0"?><root>ok</root>',
          'application/xml',
        ),
      ).toMatchObject({ isValid: false });
    });

    it('returns error for unsupported content type', () => {
      expect(validatePayloadContent('text', 'text/plain')).toMatchObject({
        isValid: false,
        error: 'Unsupported content type',
      });
    });

    it('returns error when DOMParser.parseFromString throws (line 436)', () => {
      const originalDOMParser = global.DOMParser;
      // Mock DOMParser to throw inside the inner try
      (global as any).DOMParser = class {
        parseFromString() {
          throw new Error('DOM parse failed');
        }
      };

      expect(
        validatePayloadContent('<root>ok</root>', 'application/xml'),
      ).toMatchObject({ isValid: false, message: 'Invalid XML format' });

      (global as any).DOMParser = originalDOMParser;
    });

    it('returns error when XMLParser.parse throws in validatePayloadContent (line 460)', async () => {
      const { XMLParser: ActualXMLParser } = await import('fast-xml-parser');
      const parseSpy = jest
        .spyOn(ActualXMLParser.prototype, 'parse')
        .mockImplementation(() => {
          throw new Error('XMLParser failed');
        });

      expect(
        validatePayloadContent('<root>ok</root>', 'application/xml'),
      ).toMatchObject({ isValid: false, message: 'Invalid XML format' });

      parseSpy.mockRestore();
    });
  });

  // ── validateInput ──
  describe('validateInput', () => {
    it('returns false for non-string or empty/whitespace input', () => {
      expect(validateInput(123 as unknown as string)).toBe(false);
      expect(validateInput('')).toBe(false);
      expect(validateInput('   ')).toBe(false);
    });

    it('returns false for XML with declaration', () => {
      expect(validateInput('<?xml version="1.0"?><root>ok</root>')).toBe(false);
    });

    it('returns false for XML with comments', () => {
      expect(validateInput('<!-- comment --><root>ok</root>')).toBe(false);
    });

    it('returns false for XML with DOCTYPE', () => {
      expect(validateInput('<!DOCTYPE html><root>ok</root>')).toBe(false);
    });

    it('returns false for XML with CDATA', () => {
      expect(validateInput('<root><![CDATA[data]]></root>')).toBe(false);
    });

    it('returns true for valid XML root tag', () => {
      expect(validateInput('<root>ok</root>')).toBe(true);
    });
  });

  // ── safeJsonParse ──
  describe('safeJsonParse', () => {
    it('returns empty object for falsy value', () => {
      expect(safeJsonParse(null)).toEqual({ success: true, data: {} });
      expect(safeJsonParse('')).toEqual({ success: true, data: {} });
    });

    it('parses valid JSON string', () => {
      expect(safeJsonParse('{"a":1}')).toEqual({
        success: true,
        data: { a: 1 },
      });
    });

    it('returns error for invalid JSON string', () => {
      expect(safeJsonParse('{bad')).toEqual({
        success: false,
        error: 'Invalid JSON',
      });
    });

    it('returns object value directly for non-string', () => {
      const obj = { a: 1 };
      expect(safeJsonParse(obj)).toEqual({ success: true, data: obj });
    });
  });
});
