import { Injectable, Logger } from '@nestjs/common';
import {
  JSONSchema,
  JSONSchemaProperty,
  JSONSchemaType,
  JSONSchemaFormat,
  SchemaField,
  FieldType,
} from '@tazama-lf/tcs-lib';
import { AuditService } from '../audit/audit.service';
@Injectable()
export class JSONSchemaConverterService {
  private readonly logger = new Logger(JSONSchemaConverterService.name);

  constructor(private readonly auditService: AuditService) {}

  convertToJSONSchema(fields: SchemaField[], _rootTitle?: string): JSONSchema {
    this.logger.log('Converting custom schema to JSON Schema format');
    const properties: { [key: string]: JSONSchemaProperty } = {};
    const required: string[] = [];
    for (const field of fields) {
      properties[field.name] = this.convertFieldToProperty(field);
      if (field.isRequired) {
        required.push(field.name);
      }
    }
    const schema: JSONSchema = {
      type: 'object',
      properties,
      additionalProperties: false,
    };
    if (required.length > 0) {
      schema.required = required;
    }
    this.logger.log(
      `Generated JSON Schema with ${Object.keys(properties).length} properties, ${required.length} required`,
    );

    this.auditService.logAction({
      entityType: 'SCHEMA',
      action: 'CONVERT_TO_JSON_SCHEMA',
      actor: 'SYSTEM',
      tenantId: 'default-tenant',
      details: `Converted ${fields.length} fields to JSON Schema with ${Object.keys(properties).length} properties`,
      status: 'SUCCESS',
      severity: 'LOW',
    });

    return schema;
  }
  private convertFieldToProperty(field: SchemaField): JSONSchemaProperty {
    const property: JSONSchemaProperty = {};
    switch (field.type) {
      case FieldType.STRING:
        property.type = JSONSchemaType.STRING;
        break;
      case FieldType.NUMBER:
        property.type = JSONSchemaType.NUMBER;
        break;
      case FieldType.BOOLEAN:
        property.type = JSONSchemaType.BOOLEAN;
        break;
      case FieldType.DATE:
        property.type = JSONSchemaType.STRING;
        property.format = JSONSchemaFormat.DATE_TIME;
        break;
      case FieldType.OBJECT:
        property.type = JSONSchemaType.OBJECT;
        if (field.children && field.children.length > 0) {
          property.properties = {};
          property.required = [];
          for (const child of field.children) {
            const childName = this.extractFieldName(child.path, field.path);
            property.properties[childName] = this.convertFieldToProperty(child);
            if (child.isRequired) {
              property.required.push(childName);
            }
          }
          if (property.required.length === 0) {
            delete property.required;
          }
          property.additionalProperties = false;
        }
        break;
      case FieldType.ARRAY:
        property.type = JSONSchemaType.ARRAY;
        if (field.arrayElementType) {
          property.items = this.convertElementTypeToProperty(
            field.arrayElementType,
          );
        } else if (field.children && field.children.length > 0) {
          const itemProperties: { [key: string]: JSONSchemaProperty } = {};
          const itemRequired: string[] = [];
          for (const child of field.children) {
            const childName = this.extractFieldName(child.path, field.path);
            itemProperties[childName] = this.convertFieldToProperty(child);
            if (child.isRequired) {
              itemRequired.push(childName);
            }
          }
          property.items = {
            type: JSONSchemaType.OBJECT,
            properties: itemProperties,
            required: itemRequired.length > 0 ? itemRequired : undefined,
            additionalProperties: false,
          };
        }
        break;
      default:
        property.type = JSONSchemaType.STRING;
    }
    return property;
  }
  private convertElementTypeToProperty(
    elementType: FieldType,
  ): JSONSchemaProperty {
    const property: JSONSchemaProperty = {};
    switch (elementType) {
      case FieldType.STRING:
        property.type = JSONSchemaType.STRING;
        break;
      case FieldType.NUMBER:
        property.type = JSONSchemaType.NUMBER;
        break;
      case FieldType.BOOLEAN:
        property.type = JSONSchemaType.BOOLEAN;
        break;
      case FieldType.DATE:
        property.type = JSONSchemaType.STRING;
        property.format = JSONSchemaFormat.DATE_TIME;
        break;
      case FieldType.OBJECT:
        property.type = JSONSchemaType.OBJECT;
        property.additionalProperties = false;
        break;
      default:
        property.type = JSONSchemaType.STRING;
    }
    return property;
  }
  private extractFieldName(fullPath: string, parentPath?: string): string {
    if (parentPath) {
      // Remove parent path prefix
      const remaining = fullPath.replace(`${parentPath}.`, '');
      const parts = remaining.split('.');
      
      // For array children paths like "0.PaymentId", we want to skip the numeric index
      // and return the first non-numeric part
      const nonNumericParts = parts.filter((part) => !/^\d+$/.test(part));
      if (nonNumericParts.length > 0) {
        return nonNumericParts[0];
      }
      
      // Fallback to first part if all are numeric (edge case)
      return parts[0];
    }
    
    // For paths without parent, get the last non-numeric part
    const parts = fullPath.split('.');
    const nonNumericParts = parts.filter((part) => !/^\d+$/.test(part));
    return nonNumericParts.length > 0 
      ? nonNumericParts[nonNumericParts.length - 1] 
      : parts[parts.length - 1];
  }
  convertFromJSONSchema(schema: JSONSchema): SchemaField[] {
    this.logger.log('Converting JSON Schema to custom SchemaField format');
    if (schema.type !== 'object' || !schema.properties) {
      throw new Error('JSON Schema must be of type "object" with properties');
    }
    const fields: SchemaField[] = [];
    const required = schema.required || [];
    for (const [name, property] of Object.entries(schema.properties)) {
      const field = this.convertPropertyToField(
        name,
        name,
        property,
        required.includes(name),
      );
      fields.push(field);
    }
    this.logger.log(`Converted JSON Schema to ${fields.length} fields`);
    return fields;
  }
  private convertPropertyToField(
    name: string,
    path: string,
    property: JSONSchemaProperty,
    isRequired: boolean,
  ): SchemaField {
    const field: SchemaField = {
      name,
      path,
      type: this.mapJSONSchemaTypeToFieldType(property),
      isRequired,
    };
    if (property.type === 'object' && property.properties) {
      field.children = [];
      const childRequired = property.required || [];
      for (const [childName, childProperty] of Object.entries(
        property.properties,
      )) {
        const childPath = `${path}.${childName}`;
        const childField = this.convertPropertyToField(
          childName,
          childPath,
          childProperty,
          childRequired.includes(childName),
        );
        field.children.push(childField);
      }
    }
    if (property.type === 'array' && property.items) {
      if (typeof property.items === 'object' && property.items.type) {
        if (property.items.type === 'object' && property.items.properties) {
          field.children = [];
          const itemRequired = property.items.required || [];
          for (const [itemPropName, itemProp] of Object.entries(
            property.items.properties,
          )) {
            const itemPath = `${path}.0.${itemPropName}`;
            const itemField = this.convertPropertyToField(
              itemPropName,
              itemPath,
              itemProp,
              itemRequired.includes(itemPropName),
            );
            field.children.push(itemField);
          }
        } else {
          field.arrayElementType = this.mapJSONSchemaTypeToFieldType(
            property.items,
          );
        }
      }
    }
    return field;
  }
  private mapJSONSchemaTypeToFieldType(
    property: JSONSchemaProperty,
  ): FieldType {
    if (!property.type) {
      return FieldType.STRING;
    }
    switch (property.type) {
      case 'string':
        if (
          property.format === 'date-time' ||
          property.format === 'date' ||
          property.format === 'time'
        ) {
          return FieldType.DATE;
        }
        return FieldType.STRING;
      case 'number':
      case 'integer':
        return FieldType.NUMBER;
      case 'boolean':
        return FieldType.BOOLEAN;
      case 'object':
        return FieldType.OBJECT;
      case 'array':
        return FieldType.ARRAY;
      default:
        return FieldType.STRING;
    }
  }
  validateJSONSchema(schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!schema || typeof schema !== 'object') {
      errors.push('Schema must be an object');
      return { valid: false, errors };
    }
    if (!schema.type) {
      errors.push('Schema must have a "type" property');
    }
    if (schema.type === 'object' && !schema.properties) {
      errors.push('Object schema must have "properties"');
    }
    if (schema.type === 'array' && !schema.items) {
      errors.push('Array schema must have "items"');
    }
    return { valid: errors.length === 0, errors };
  }
  generateExampleFromSchema(schema: JSONSchema): any {
    if (schema.type !== 'object' || !schema.properties) {
      return {};
    }
    const example: any = {};
    for (const [name, property] of Object.entries(schema.properties)) {
      example[name] = this.generateExampleValue(property);
    }
    return example;
  }
  private generateExampleValue(property: JSONSchemaProperty): any {
    if (property.examples && property.examples.length > 0) {
      return property.examples[0];
    }
    if (property.default !== undefined) {
      return property.default;
    }
    switch (property.type) {
      case 'string':
        if (property.format === 'date-time') {
          return new Date().toISOString();
        }
        if (property.format === 'email') {
          return 'example@example.com';
        }
        if (property.format === 'uuid') {
          return '123e4567-e89b-12d3-a456-426614174000';
        }
        return 'example';
      case 'number':
      case 'integer':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        if (property.properties) {
          const obj: any = {};
          for (const [key, val] of Object.entries(property.properties)) {
            obj[key] = this.generateExampleValue(val);
          }
          return obj;
        }
        return {};
      default:
        return null;
    }
  }
}
