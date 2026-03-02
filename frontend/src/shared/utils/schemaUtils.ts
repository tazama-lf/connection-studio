export interface InferredField {
  path: string;
  type: 'String' | 'Number' | 'Boolean' | 'Object' | 'Array';
  required: boolean;
  level: number;
}

// Convert inferred fields to proper JSON Schema format
export const convertInferredFieldsToJsonSchema = (
  fields: InferredField[],
): any => {
  if (fields.length === 0) {
    return null;
  }

  // Build schema recursively by processing fields level by level
  const buildSchema = (fieldsSubset: InferredField[], parentPath = ''): any => {
    const properties: any = {};
    const required: string[] = [];

    // Get immediate children of the current parent
    const directChildren = fieldsSubset.filter((f) => {
      if (parentPath === '') {
        // Root level: no dots and no brackets in path
        return !f.path.includes('.') && !f.path.includes('[');
      }

      // For nested fields, check if this field's parent matches
      // Handle both object children (.) and array children ([0])
      const pathWithoutParent = f.path.startsWith(parentPath + '.')
        ? f.path.substring(parentPath.length + 1)
        : f.path.startsWith(parentPath + '[0].')
          ? f.path.substring(parentPath.length + 4)
          : null;

      if (!pathWithoutParent) return false;

      // This is a direct child if it has no more dots or brackets (except trailing [0])
      const remainingPath = pathWithoutParent.replace(/\[0\]$/, '');
      return !remainingPath.includes('.') && !remainingPath.includes('[');
    });

    directChildren.forEach((field) => {
      // Extract the field name (remove [0] suffix if present)
      const fieldName =
        parentPath === ''
          ? field.path.replace(/\[0\]$/, '')
          : field.path.startsWith(parentPath + '.')
            ? field.path.substring(parentPath.length + 1).replace(/\[0\]$/, '')
            : field.path.substring(parentPath.length + 4).replace(/\[0\]$/, '');

      // Check if this is an array by looking at the path or type
      const isArray = field.path.endsWith('[0]') || field.type === 'Array';

      if (isArray) {
        // Find children for array items (fields that start with parentPath.fieldName[0])
        const arrayPath = parentPath
          ? `${parentPath}.${fieldName}[0]`
          : `${fieldName}[0]`;
        const arrayChildren = fieldsSubset.filter(
          (f) => f.path.startsWith(arrayPath + '.') && f.path !== arrayPath,
        );

        if (arrayChildren.length > 0) {
          // Recursively build schema for array items
          const itemsSchema = buildSchema(fieldsSubset, arrayPath);
          properties[fieldName] = {
            type: 'array',
            items: itemsSchema,
          };
        } else {
          // Empty array or primitive array
          properties[fieldName] = {
            type: 'array',
            items: { type: 'string' },
          };
        }
      } else if (field.type === 'Object') {
        // Find children for this object
        const objectPath = parentPath
          ? `${parentPath}.${fieldName}`
          : fieldName;
        const objectChildren = fieldsSubset.filter(
          (f) =>
            (f.path.startsWith(objectPath + '.') ||
              f.path.startsWith(objectPath + '[')) &&
            f.path !== objectPath,
        );

        if (objectChildren.length > 0) {
          // Recursively build schema for nested object
          const nestedSchema = buildSchema(fieldsSubset, objectPath);
          properties[fieldName] = nestedSchema;
        } else {
          // Empty object
          properties[fieldName] = {
            type: 'object',
            additionalProperties: false,
          };
        }
      } else {
        // Primitive type
        properties[fieldName] = {
          type: field.type.toLowerCase(),
        };
      }

      if (field.required) {
        required.push(fieldName);
      }
    });

    const schema: any = {
      type: 'object',
      properties,
      additionalProperties: false,
    };

    if (required.length > 0) {
      schema.required = required;
    }

    return schema;
  };

  const result = buildSchema(fields, '');
  return result;
};
