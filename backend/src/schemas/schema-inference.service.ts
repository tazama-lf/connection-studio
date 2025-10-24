import { Injectable, Logger } from '@nestjs/common';
import { SchemaField, ContentType, FieldType } from '@tazama-lf/tcs-lib';
import { parseStringPromise } from 'xml2js';
@Injectable()
export class SchemaInferenceService {
  private readonly logger = new Logger(SchemaInferenceService.name);
  async inferSchemaFromPayload(
    payload: string,
    contentType: ContentType,
  ): Promise<SchemaField[]> {
    if (contentType === ContentType.JSON) {
      return this.inferFromJson(payload);
    }
    if (contentType === ContentType.XML) {
      return await this.inferFromXml(payload);
    }
    throw new Error(`Unsupported content type: ${String(contentType)}`);
  }
  private inferFromJson(jsonString: string): SchemaField[] {
    try {
      const parsed = JSON.parse(jsonString);
      return this.analyzeObject(parsed, '');
    } catch (error) {
      throw new Error(`Invalid JSON payload: ${error.message}`);
    }
  }
  private async inferFromXml(xmlString: string): Promise<SchemaField[]> {
    try {
      const parsed = await parseStringPromise(xmlString, {
        explicitArray: false,
        mergeAttrs: true,
        trim: true,
      });
      const rootKey = Object.keys(parsed)[0];
      const rootValue = parsed[rootKey];
      return this.analyzeXmlObject(rootValue, rootKey, '');
    } catch (error) {
      throw new Error(`Invalid XML payload: ${error.message}`);
    }
  }
  private analyzeXmlObject(
    obj: any,
    name: string,
    parentPath: string,
  ): SchemaField[] {
    const fields: SchemaField[] = [];
    if (typeof obj !== 'object' || obj === null) {
      fields.push({
        name,
        path: parentPath ? `${parentPath}.${name}` : name,
        type: this.inferXmlType(obj),
        isRequired: true,
      });
      return fields;
    }
    for (const [key, value] of Object.entries(obj)) {
      const path = parentPath ? `${parentPath}.${key}` : key;
      if (Array.isArray(value)) {
        const arrayField: SchemaField = {
          name: key,
          path,
          type: FieldType.ARRAY,
          isRequired: true,
          arrayElementType:
            value.length > 0 ? this.inferXmlType(value[0]) : FieldType.STRING,
        };
        if (
          arrayField.arrayElementType === FieldType.OBJECT &&
          value.length > 0
        ) {
          arrayField.children = this.analyzeXmlObject(
            value[0],
            key,
            `${path}[0]`,
          );
        }
        fields.push(arrayField);
      } else if (typeof value === 'object' && value !== null) {
        const objField: SchemaField = {
          name: key,
          path,
          type: FieldType.OBJECT,
          isRequired: true,
          children: this.analyzeXmlObject(value, key, path),
        };
        fields.push(objField);
      } else {
        fields.push({
          name: key,
          path,
          type: this.inferXmlType(value),
          isRequired: true,
        });
      }
    }
    return fields;
  }
  private inferXmlType(value: any): FieldType {
    if (Array.isArray(value)) {
      return FieldType.ARRAY;
    }
    if (typeof value === 'object' && value !== null) {
      return FieldType.OBJECT;
    }
    if (typeof value === 'string') {
      if (/^-?\d+(\.\d+)?$/.test(value)) {
        return FieldType.NUMBER;
      }
      if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        return FieldType.BOOLEAN;
      }
      return FieldType.STRING;
    }
    if (typeof value === 'number') {
      return FieldType.NUMBER;
    }
    if (typeof value === 'boolean') {
      return FieldType.BOOLEAN;
    }
    return FieldType.STRING;
  }
  private analyzeObject(obj: any, parentPath: string): SchemaField[] {
    const fields: SchemaField[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const field = this.createSchemaField(key, path, value);
      fields.push(field);
    }
    return fields;
  }
  private createSchemaField(
    name: string,
    path: string,
    value: any,
  ): SchemaField {
    const field: SchemaField = {
      name,
      path,
      type: this.inferType(value),
      isRequired: true,
    };
    if (field.type === FieldType.OBJECT && value !== null) {
      field.children = this.analyzeObject(value, path);
    } else if (field.type === FieldType.ARRAY && Array.isArray(value)) {
      if (value.length > 0) {
        const firstElement = value[0];
        field.arrayElementType = this.inferType(firstElement);
        if (
          field.arrayElementType === FieldType.OBJECT &&
          firstElement !== null
        ) {
          field.children = this.analyzeObject(firstElement, `${path}[0]`);
        }
      } else {
        field.arrayElementType = FieldType.STRING;
      }
    }
    return field;
  }
  private inferType(value: any): FieldType {
    if (Array.isArray(value)) {
      return FieldType.ARRAY;
    }
    if (typeof value === 'object' && value !== null) {
      return FieldType.OBJECT;
    }
    if (typeof value === 'number') {
      return FieldType.NUMBER;
    }
    if (typeof value === 'boolean') {
      return FieldType.BOOLEAN;
    }
    return FieldType.STRING;
  }
  validateSchema(fields: SchemaField[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const paths = new Set<string>();
    this.collectAllPaths(fields, paths);
    this.validateFields(fields, paths, errors);
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
  private collectAllPaths(fields: SchemaField[], paths: Set<string>) {
    for (const field of fields) {
      if (field.path) {
        paths.add(field.path);
      }
      if (field.children) {
        this.collectAllPaths(field.children, paths);
      }
    }
  }
  private validateFields(
    fields: SchemaField[],
    allPaths: Set<string>,
    errors: string[],
    _parentPath = '',
  ) {
    const seenPaths = new Set<string>();
    for (const field of fields) {
      if (!field.name || field.name.trim() === '') {
        errors.push(
          `Validation error: Field at path '${field.path ?? ''}' has empty name.`,
        );
      }
      if (!field.type || !Object.values(FieldType).includes(field.type)) {
        errors.push(
          `Validation error: Field '${field.path ?? ''}' has invalid type '${field.type ?? ''}'.`,
        );
      }
      if (field.path) {
        if (seenPaths.has(field.path)) {
          const errorMsg = `Validation error: Duplicate field path '${field.path}' detected.`;
          errors.push(errorMsg);
          
          // Log detailed error information
          this.logger.error(
            `Schema inference validation failed: ${errorMsg}`,
            {
              duplicateFieldPath: field.path,
              fieldName: field.name,
              fieldType: field.type,
              context: 'validateFields',
              parentPath: _parentPath,
            },
          );
        } else {
          seenPaths.add(field.path);
        }
        this.validatePathConflicts(field.path, field.type, allPaths, errors);
      }
      if (field.type === FieldType.ARRAY && field.arrayElementType) {
        if (!Object.values(FieldType).includes(field.arrayElementType)) {
          errors.push(
            `Validation error: Field '${field.path ?? ''}' has invalid array element type '${field.arrayElementType ?? ''}'.`,
          );
        }
      }
      if (field.type === FieldType.OBJECT && field.children) {
        this.validateFields(field.children, allPaths, errors, field.path);
      }
    }
  }
  private validatePathConflicts(
    currentPath: string,
    currentType: FieldType,
    allPaths: Set<string>,
    errors: string[],
  ) {
    for (const existingPath of allPaths) {
      if (existingPath === currentPath) {
        continue;
      }
      if (existingPath.startsWith(currentPath + '.')) {
        if (
          currentType !== FieldType.OBJECT &&
          currentType !== FieldType.ARRAY
        ) {
          errors.push(
            `Validation error: Path conflict - '${currentPath}' cannot be type '${currentType}' because child path '${existingPath}' exists.`,
          );
        }
      }
      if (currentPath.startsWith(existingPath + '.')) {
        continue;
      }
      if (this.hasArrayIndexConflict(currentPath, existingPath)) {
        errors.push(
          `Validation error: Array index conflict between '${currentPath}' and '${existingPath}'.`,
        );
      }
    }
  }
  private hasArrayIndexConflict(path1: string, path2: string): boolean {
    const arrayIndexRegex = /\[\d+\]/g;
    const path1WithoutIndex = path1.replace(arrayIndexRegex, '');
    const path2WithoutIndex = path2.replace(arrayIndexRegex, '');
    if (path1WithoutIndex === path2WithoutIndex && path1 !== path2) {
      const path1HasIndex = arrayIndexRegex.test(path1);
      const path2HasIndex = arrayIndexRegex.test(path2);
      if (path1HasIndex !== path2HasIndex) {
        return true;
      }
    }
    return false;
  }
}
