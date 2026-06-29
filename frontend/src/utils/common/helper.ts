import type { SchemaField } from '@features/config';
import type { InferredField } from '@shared/types';
import {
  eventTypeSchema,
  transactionTypeSchema,
  versionSchema,
} from '@shared/validators';
import { XMLParser } from 'fast-xml-parser';
import * as yup from 'yup';

const FIRST_ELEMENT_INDEX = 0;
const ROOT_PATH_INDEX = 0;
const ARRAY_PARENT_SUFFIX_LENGTH = 2;
const DEFAULT_LEVEL = 0;
const NEXT_LEVEL = 1;
const XML_ROOT_TAG_PATTERN =
  /^\s*<(?:[A-Za-z_][A-Za-z0-9_-]*)>[\s\S]*<\/(?:[A-Za-z_][A-Za-z0-9_-]*)>\s*$/;
const JSON_CONTENT_TYPE = 'application/json';
const XML_CONTENT_TYPE = 'application/xml';

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

export default function ensurePromise<
  T extends (...args: unknown[]) => unknown,
>(fn: T): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      const result = await fn(...args);
      return result as Awaited<ReturnType<T>>;
    } catch (err) {
      if (err instanceof Error) throw err;
      throw new Error('Unexpected error', { cause: err });
    }
  };
}

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';

  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
};

export const capitalizeFirstLetter = (s: string): string => {
  const firstChar = s.charAt(FIRST_ELEMENT_INDEX).toUpperCase();
  const rest = s.slice(NEXT_LEVEL).toLowerCase();
  return `${firstChar}${rest}`;
};

// export const generateJSONSchema = (
//   obj: Record<string, unknown>,
//   path = '',
// ): SchemaField[] => {
//   const schema: SchemaField[] = [];

//   Object.entries(obj).forEach(([key, value]) => {
//     const fieldPath = path ? `${path}.${key}` : key;

//     const field: SchemaField = {
//       name: key,
//       path: fieldPath,
//       type: Array.isArray(value)
//         ? 'array'
//         : typeof value === 'object'
//           ? 'object'
//           : (typeof value as SchemaField['type']),
//       isRequired: true,
//     };

//     // Handle nested object
//     if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
//       field.children = generateJSONSchema(
//         value as Record<string, unknown>,
//         fieldPath,
//       );
//     }

//     // Handle array
//     else if (Array.isArray(value)) {
//       field.children = [];

//       value.forEach((item, index) => {
//         const itemPath = `${fieldPath}[${index}]`;

//         // Array element is an object
//         if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
//           field.children!.push({
//             name: `[${index}]`,
//             path: itemPath,
//             type: 'object',
//             isRequired: true,
//             children: generateJSONSchema(
//               item as Record<string, unknown>,
//               itemPath,
//             ),
//           });
//         }

//         // Array element is another array
//         else if (Array.isArray(item)) {
//           field.children!.push({
//             name: `[${index}]`,
//             path: itemPath,
//             type: 'array',
//             isRequired: true,
//             children: [],
//           });
//         }

//         // Array element is a primitive
//         else {
//           field.children!.push({
//             name: `[${index}]`,
//             path: itemPath,
//             type: typeof item as SchemaField['type'],
//             isRequired: true,
//           });
//         }
//       });
//     }

//     schema.push(field);
//   });

//   return schema;
// };

export const generateJSONSchema = (obj: unknown, path = ''): SchemaField[] => {
  const schema: SchemaField[] = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const record = obj as Record<string, unknown>;
    Object.entries(record).forEach(([key, value]) => {
      const fieldPath = path ? `${path}.${key}` : key;
      let fieldType: string;
      if (Array.isArray(value)) {
        fieldType = 'array';
      } else if (value && typeof value === 'object') {
        fieldType = 'object';
      } else {
        fieldType = typeof value;
      }
      const field: SchemaField = {
        name: key,
        path: fieldPath,
        type: fieldType as 'string' | 'number' | 'boolean' | 'object' | 'array',
        isRequired: true,
      };
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        field.children = generateJSONSchema(value, fieldPath);
      } else if (Array.isArray(value) && value.length > FIRST_ELEMENT_INDEX) {
        const [firstElement] = value as unknown[];
        if (
          typeof firstElement === 'object' &&
          firstElement !== null &&
          !Array.isArray(firstElement)
        ) {
          field.path = `${fieldPath}[0]`;
          field.children = generateJSONSchema(firstElement, `${fieldPath}[0]`);
          field.arrayElementType = 'object';
        } else if (Array.isArray(firstElement)) {
          field.children = [];
          field.arrayElementType = 'array';
        } else {
          field.arrayElementType = typeof firstElement;
        }
      }
      schema.push(field);
    });
  }
  return schema;
};

export const convertSchemaFieldsToInferredFields = (
  schemaFields: SchemaField[],
): InferredField[] => {
  const convertFields = (fields: SchemaField[]): InferredField[] => {
    const inferredFields: InferredField[] = [];
    fields.forEach((field) => {
      const dotCount = (field.path.match(/\./g) ?? []).length;
      const level = dotCount;
      // no-op for arrays here; handled below when children exist
      const inferredField: InferredField = {
        path: field.path,
        type: capitalizeFirstLetter(field.type) as InferredField['type'],
        level,
        parent: field.path.includes('.')
          ? field.path.includes('.0.')
            ? field.path.substring(
                ROOT_PATH_INDEX,
                field.path.lastIndexOf('.0.') + ARRAY_PARENT_SUFFIX_LENGTH,
              )
            : field.path.substring(ROOT_PATH_INDEX, field.path.lastIndexOf('.'))
          : undefined,
        required: field.isRequired,
      };
      inferredFields.push(inferredField);
      if (field.children && field.children.length > FIRST_ELEMENT_INDEX) {
        const childFields = convertFields(field.children);
        // array-specific handling not required here
        inferredFields.push(...childFields);
      }
    });
    return inferredFields;
  };
  return convertFields(schemaFields);
};

export const convertSchemaToFields = (
  schemaFields: SchemaField[],
  payload?: unknown,
  level = DEFAULT_LEVEL,
  parentPath = '',
): InferredField[] => {
  const fields: InferredField[] = [];

  schemaFields.forEach((field) => {
    const currentValue =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)[
            field.path.split('.').pop() ?? ''
          ]
        : undefined;

    if (field.type === 'array' && Array.isArray(currentValue)) {
      currentValue.forEach((item, index) => {
        const arrayPath = `${field.path}[${index}]`;

        fields.push({
          path: arrayPath,
          type: 'Array',
          level,
          parent:
            parentPath ||
            (arrayPath.includes('.')
              ? arrayPath.substring(ROOT_PATH_INDEX, arrayPath.lastIndexOf('.'))
              : undefined),
          required: field.isRequired,
        });

        if (field.children) {
          fields.push(
            ...convertSchemaToFields(
              field.children,
              item,
              level + NEXT_LEVEL,
              arrayPath,
            ),
          );
        }
      });

      return;
    }

    fields.push({
      path: field.path,
      type: capitalizeFirstLetter(field.type) as InferredField['type'],
      level,
      parent:
        parentPath ||
        (field.path.includes('.')
          ? field.path.substring(ROOT_PATH_INDEX, field.path.lastIndexOf('.'))
          : undefined),
      required: field.isRequired,
    });

    if (field.children) {
      fields.push(
        ...convertSchemaToFields(
          field.children,
          currentValue,
          level + NEXT_LEVEL,
          field.path,
        ),
      );
    }
  });

  return fields;
};

export const generateSchemaFromPayload = (
  payload: unknown,
  contentType: string,
): SchemaField[] | null => {
  if (contentType === JSON_CONTENT_TYPE) {
    try {
      let parsedObj: Record<string, unknown> | undefined;
      if (typeof payload === 'string') {
        const tmp: unknown = JSON.parse(payload);
        if (isRecord(tmp)) {
          parsedObj = tmp;
        }
      } else if (isRecord(payload)) {
        parsedObj = payload;
      }

      if (!parsedObj) {
        throw new Error('Invalid JSON structure');
      }

      return generateJSONSchema(parsedObj);
    } catch (e) {
      throw new Error('Invalid JSON format', { cause: e });
    }
  } else if (contentType === XML_CONTENT_TYPE) {
    try {
      if (typeof payload !== 'string') {
        throw new Error('XML payload must be a string');
      }
      const xmlparser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
      });
      const jsonResult: unknown = xmlparser.parse(payload);
      if (!isRecord(jsonResult)) {
        throw new Error('Invalid XML structure');
      }
      return generateJSONSchema(jsonResult);
    } catch (e) {
      throw new Error('Invalid XML format', { cause: e });
    }
  }
  return null;
};

export const validateTransactionType = (transactionType: string): string => {
  try {
    transactionTypeSchema.validateSync(transactionType);
    return '';
  } catch (err) {
    return err instanceof yup.ValidationError
      ? err.message
      : 'Invalid transaction type format';
  }
};

export const validateVersion = (version: string): string => {
  try {
    versionSchema.validateSync(version);
    return '';
  } catch (err) {
    return err instanceof yup.ValidationError
      ? err.message
      : 'Invalid version format';
  }
};

export const validateEventType = (eventType: string): string => {
  try {
    eventTypeSchema.validateSync(eventType);
    return '';
  } catch (err) {
    return err instanceof yup.ValidationError
      ? err.message
      : 'Invalid event type format';
  }
};

export const validatePayloadContent = (
  payloadValue: unknown,
  contentType: string,
): { isValid: boolean; message: string; error: string } => {
  if (!payloadValue) {
    return { isValid: true, message: '', error: '' };
  }
  if (contentType === JSON_CONTENT_TYPE) {
    try {
      if (typeof payloadValue === 'string') {
        const parsed: unknown = JSON.parse(payloadValue);
        if (
          parsed === null ||
          Array.isArray(parsed) ||
          typeof parsed !== 'object'
        ) {
          throw new Error('Invalid JSON structure');
        }
      } else if (
        Array.isArray(payloadValue) ||
        typeof payloadValue !== 'object'
      ) {
        throw new Error('Invalid JSON structure');
      }

      return {
        isValid: true,
        message: 'Valid JSON format detected',
        error: '',
      };
    } catch {
      return {
        isValid: false,
        message: 'Invalid JSON format',
        error: 'Invalid JSON formats',
      };
    }
  } else if (contentType === 'application/xml') {
    try {
      if (typeof payloadValue !== 'string') {
        return {
          isValid: false,
          message: 'Invalid XML format',
          error: 'Invalid XML format',
        };
      }
      const xmlStr = payloadValue;
      // attempt to parse using XMLParser to validate structure
      const parser = new XMLParser({ ignoreAttributes: false });
      const parsed: unknown = parser.parse(xmlStr);
      const result = isRecord(parsed) && validateInput(xmlStr);
      if (!result) {
        return {
          isValid: false,
          message: 'Invalid XML format',
          error: 'Invalid XML format',
        };
      }
      return {
        isValid: true,
        message: 'Valid XML format detected',
        error: '',
      };
    } catch (e) {
      return {
        isValid: false,
        message: 'Invalid XML format',
        error: 'Invalid XML format',
      };
    }
  }
  return { isValid: false, message: '', error: 'Unsupported content type' };
};

export const validateInput = (input: string): boolean => {
  if (typeof input !== 'string' || !input.trim()) {
    return false;
  }

  // Reject XML declarations / processing instructions
  if (/<\?[\s\S]*?\?>/.test(input)) {
    return false;
  }

  // Reject comments
  if (/<!--[\s\S]*?-->/.test(input)) {
    return false;
  }

  // Reject DOCTYPE
  if (/<!DOCTYPE/i.test(input)) {
    return false;
  }

  // Reject CDATA
  if (/<!\[CDATA\[/i.test(input)) {
    return false;
  }

  return XML_ROOT_TAG_PATTERN.test(input);
};

export const safeJsonParse = (
  value: Record<string, unknown> | string | null,
): { success: boolean; data?: unknown; error?: string } => {
  if (!value) {
    return { success: true, data: {} };
  }

  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return {
        success: true,
        data: parsed,
      };
    } catch {
      return {
        success: false,
        error: 'Invalid JSON',
      };
    }
  }

  return {
    success: true,
    data: value,
  };
};
