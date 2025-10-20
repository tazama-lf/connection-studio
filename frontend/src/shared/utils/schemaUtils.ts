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
  console.log('🔄 Converting inferred fields to JSON Schema:', fields);

  if (fields.length === 0) {
    return null;
  }

  // Group fields by their root level (no dots in path)
  const rootFields = fields.filter((f) => !f.path.includes('.'));
  const nestedFields = fields.filter((f) => f.path.includes('.'));

  const properties: any = {};
  const required: string[] = [];

  // Process root level fields
  rootFields.forEach((field) => {
    const fieldName = field.path;

    // Find nested fields for this root field
    const childFields = nestedFields.filter((f) =>
      f.path.startsWith(fieldName + '.'),
    );

    if (field.type === 'Object' && childFields.length > 0) {
      // Convert child fields for nested object
      const childInferredFields = childFields.map((cf) => ({
        ...cf,
        path: cf.path.substring(fieldName.length + 1), // Remove the parent path
        level: cf.level - 1,
      }));

      const nestedSchema =
        convertInferredFieldsToJsonSchema(childInferredFields);
      properties[fieldName] = {
        type: 'object',
        ...nestedSchema,
        additionalProperties: false,
      };
    } else if (field.type === 'Array') {
      // Find nested fields for this array field to define the items schema
      const arrayItemFields = nestedFields.filter((f) =>
        f.path.startsWith(fieldName + '.'),
      );

      if (arrayItemFields.length > 0) {
        // Convert child fields for array items
        const arrayItemInferredFields = arrayItemFields.map((cf) => ({
          ...cf,
          path: cf.path.substring(fieldName.length + 1), // Remove the parent array path
          level: cf.level - 1,
        }));

        const itemsSchema = convertInferredFieldsToJsonSchema(
          arrayItemInferredFields,
        );
        properties[fieldName] = {
          type: 'array',
          items: itemsSchema || { type: 'object', additionalProperties: false },
        };
      } else {
        properties[fieldName] = {
          type: 'array',
          items: { type: 'string' }, // Default array item type
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

  const schema: any = {
    type: 'object',
    properties,
    additionalProperties: false,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  console.log('✅ Generated JSON Schema:', JSON.stringify(schema, null, 2));
  return schema;
};
