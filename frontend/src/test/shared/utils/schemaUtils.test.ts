import { convertInferredFieldsToJsonSchema, type InferredField } from '../../../shared/utils/schemaUtils';

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
      { path: 'users.name', type: 'String', required: true, level: 1 },
      { path: 'users.email', type: 'String', required: false, level: 1 },
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
      { path: 'company.employees.name', type: 'String', required: true, level: 2 },
      { path: 'company.employees.role', type: 'String', required: false, level: 2 },
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
});