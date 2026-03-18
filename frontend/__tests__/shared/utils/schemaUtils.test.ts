import {
  convertInferredFieldsToJsonSchema,
  type InferredField,
} from '../../../shared/utils/schemaUtils';

describe('convertInferredFieldsToJsonSchema', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return null for empty fields array', () => {
    const result = convertInferredFieldsToJsonSchema([]);
    expect(result).toBeNull();
  });

  it('should convert simple string field', () => {
    const fields: InferredField[] = [
      { path: 'name', type: 'String', required: true, level: 0 },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
      additionalProperties: false,
    });
  });

  it('should convert multiple simple fields', () => {
    const fields: InferredField[] = [
      { path: 'name', type: 'String', required: true, level: 0 },
      { path: 'age', type: 'Number', required: false, level: 0 },
      { path: 'active', type: 'Boolean', required: true, level: 0 },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        active: { type: 'boolean' },
      },
      required: ['name', 'active'],
      additionalProperties: false,
    });
  });

  it('should convert nested object fields', () => {
    const fields: InferredField[] = [
      { path: 'user', type: 'Object', required: true, level: 0 },
      { path: 'user.name', type: 'String', required: true, level: 1 },
      { path: 'user.age', type: 'Number', required: false, level: 1 },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name'],
          additionalProperties: false,
        },
      },
      required: ['user'],
      additionalProperties: false,
    });
  });

  it('should convert array fields with primitive items', () => {
    const fields: InferredField[] = [
      { path: 'tags', type: 'Array', required: false, level: 0 },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      additionalProperties: false,
    });
  });

  it('should convert array fields with object items', () => {
    const fields: InferredField[] = [
      { path: 'users', type: 'Array', required: true, level: 0 },
      { path: 'users[0].name', type: 'String', required: true, level: 1 },
      { path: 'users[0].email', type: 'String', required: false, level: 1 },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
            required: ['name'],
            additionalProperties: false,
          },
        },
      },
      required: ['users'],
      additionalProperties: false,
    });
  });

  it('should handle deeply nested structures', () => {
    const fields: InferredField[] = [
      { path: 'company', type: 'Object', required: true, level: 0 },
      { path: 'company.name', type: 'String', required: true, level: 1 },
      { path: 'company.employees', type: 'Array', required: true, level: 1 },
      {
        path: 'company.employees[0].name',
        type: 'String',
        required: true,
        level: 2,
      },
      {
        path: 'company.employees[0].role',
        type: 'String',
        required: false,
        level: 2,
      },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        company: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            employees: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  role: { type: 'string' },
                },
                required: ['name'],
                additionalProperties: false,
              },
            },
          },
          required: ['name', 'employees'],
          additionalProperties: false,
        },
      },
      required: ['company'],
      additionalProperties: false,
    });
  });

  it('should handle mixed field types at different levels', () => {
    const fields: InferredField[] = [
      { path: 'id', type: 'String', required: true, level: 0 },
      { path: 'profile', type: 'Object', required: false, level: 0 },
      { path: 'profile.firstName', type: 'String', required: true, level: 1 },
      { path: 'profile.lastName', type: 'String', required: true, level: 1 },
      { path: 'tags', type: 'Array', required: false, level: 0 },
      { path: 'metadata', type: 'Object', required: false, level: 0 },
      { path: 'metadata.createdAt', type: 'String', required: false, level: 1 },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        id: { type: 'string' },
        profile: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
          },
          required: ['firstName', 'lastName'],
          additionalProperties: false,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
        metadata: {
          type: 'object',
          properties: {
            createdAt: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      required: ['id'],
      additionalProperties: false,
    });
  });

  it('should omit root required when no root fields are required', () => {
    const fields: InferredField[] = [
      { path: 'optionalName', type: 'String', required: false, level: 0 },
      { path: 'optionalAge', type: 'Number', required: false, level: 0 },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        optionalName: { type: 'string' },
        optionalAge: { type: 'number' },
      },
      additionalProperties: false,
    });
    expect(result).not.toHaveProperty('required');
  });

  it('should handle Object field with no children (empty object)', () => {
    const fields: InferredField[] = [
      { path: 'emptyObj', type: 'Object', required: true, level: 0 },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        emptyObj: {
          type: 'object',
          additionalProperties: false,
        },
      },
      required: ['emptyObj'],
      additionalProperties: false,
    });
  });

  it('should parse object children addressed with [0] syntax under a non-array parent', () => {
    const fields: InferredField[] = [
      { path: 'container', type: 'Object', required: true, level: 0 },
      { path: 'container[0].name', type: 'String', required: true, level: 1 },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        container: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
          additionalProperties: false,
        },
      },
      required: ['container'],
      additionalProperties: false,
    });
  });

  it('should build nested object paths when object fields appear below another object', () => {
    const fields: InferredField[] = [
      { path: 'root', type: 'Object', required: true, level: 0 },
      { path: 'root.child', type: 'Object', required: true, level: 1 },
      { path: 'root.child.value', type: 'String', required: false, level: 2 },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        root: {
          type: 'object',
          properties: {
            child: {
              type: 'object',
              properties: {
                value: { type: 'string' },
              },
              additionalProperties: false,
            },
          },
          required: ['child'],
          additionalProperties: false,
        },
      },
      required: ['root'],
      additionalProperties: false,
    });
  });

  it('should ignore unrelated nested children while building each parent subtree', () => {
    const fields: InferredField[] = [
      { path: 'root', type: 'Object', required: true, level: 0 },
      { path: 'root.name', type: 'String', required: true, level: 1 },
      { path: 'other', type: 'Object', required: false, level: 0 },
      { path: 'other.code', type: 'String', required: false, level: 1 },
    ];

    const result = convertInferredFieldsToJsonSchema(fields);

    expect(result).toEqual({
      type: 'object',
      properties: {
        root: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
          additionalProperties: false,
        },
        other: {
          type: 'object',
          properties: {
            code: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      required: ['root'],
      additionalProperties: false,
    });
  });
});
