export interface InferredField {
  path: string;
  type: 'String' | 'Number' | 'Boolean' | 'Object' | 'Array';
  required: boolean;
  level: number;
}

interface JsonSchemaProperty {
  type: string;
  items?: JsonSchemaProperty | { type: string };
  properties?: Record<string, JsonSchemaProperty>;
  additionalProperties?: boolean;
}

interface JsonSchema extends JsonSchemaProperty {
  required?: string[];
}

const ARRAY_SUFFIX_LENGTH = 4;
const DOT_LENGTH = 1;
const ARRAY_INDEX_START = 0;

export const convertInferredFieldsToJsonSchema = (
  fields: InferredField[],
): JsonSchema | null => {
  if (fields.length === ARRAY_INDEX_START) {
    return null;
  }

  const buildSchema = (fieldsSubset: InferredField[], parentPath = ''): JsonSchema => {
    const properties: Record<string, JsonSchemaProperty> = {};
    const required: string[] = [];

    const directChildren = fieldsSubset.filter((f) => {
      if (parentPath === '') {
        return !f.path.includes('.') && !f.path.includes('[');
      }

      const pathWithoutParent = f.path.startsWith(parentPath + '.')
        ? f.path.substring(parentPath.length + DOT_LENGTH)
        : f.path.startsWith(parentPath + '[0].')
          ? f.path.substring(parentPath.length + ARRAY_SUFFIX_LENGTH)
          : null;

      if (!pathWithoutParent) return false;

      const remainingPath = pathWithoutParent.replace(/\[0\]$/, '');
      return !remainingPath.includes('.') && !remainingPath.includes('[');
    });

    directChildren.forEach((field) => {
      const fieldName =
        parentPath === ''
          ? field.path.replace(/\[0\]$/, '')
          : field.path.startsWith(parentPath + '.')
            ? field.path.substring(parentPath.length + DOT_LENGTH).replace(/\[0\]$/, '')
            : field.path.substring(parentPath.length + ARRAY_SUFFIX_LENGTH).replace(/\[0\]$/, '');

      const isArray = field.path.endsWith('[0]') || field.type === 'Array';

      if (isArray) {
        const arrayPath = parentPath
          ? `${parentPath}.${fieldName}[0]`
          : `${fieldName}[0]`;
        const arrayChildren = fieldsSubset.filter(
          (f) => f.path.startsWith(arrayPath + '.') && f.path !== arrayPath,
        );

        if (arrayChildren.length > ARRAY_INDEX_START) {
          const itemsSchema = buildSchema(fieldsSubset, arrayPath);
          properties[fieldName] = {
            type: 'array',
            items: itemsSchema,
          };
        } else {
          properties[fieldName] = {
            type: 'array',
            items: { type: 'string' },
          };
        }
      } else if (field.type === 'Object') {
        const objectPath = parentPath
          ? `${parentPath}.${fieldName}`
          : fieldName;
        const objectChildren = fieldsSubset.filter(
          (f) =>
            (f.path.startsWith(objectPath + '.') ||
              f.path.startsWith(objectPath + '[')) &&
            f.path !== objectPath,
        );

        if (objectChildren.length > ARRAY_INDEX_START) {
          const nestedSchema = buildSchema(fieldsSubset, objectPath);
          properties[fieldName] = nestedSchema;
        } else {
          properties[fieldName] = {
            type: 'object',
            additionalProperties: false,
          };
        }
      } else {
        properties[fieldName] = {
          type: field.type.toLowerCase(),
        };
      }

      if (field.required) {
        required.push(fieldName);
      }
    });

    const schema: JsonSchema = {
      type: 'object',
      properties,
      additionalProperties: false,
    };

    if (required.length > ARRAY_INDEX_START) {
      schema.required = required;
    }

    return schema;
  };

  const result = buildSchema(fields, '');
  return result;
};
