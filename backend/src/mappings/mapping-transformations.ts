/**
 * Mapping Transformation Utilities
 * Provides clean, testable transformation functions for mapping operations
 */
import { BadRequestException } from '@nestjs/common';
export class MappingTransformations {
  /**
   * Direct pass-through transformation (no change)
   */
  static direct(value: any): any {
    return value;
  }
  /**
   * Concatenate multiple values with optional separator
   */
  static concat(fields: any[], separator = ' '): string {
    if (!Array.isArray(fields)) {
      throw new BadRequestException(
        'CONCAT transformation requires an array of string values',
      );
    }
    const validFields = fields
      .filter((field) => field !== null && field !== undefined)
      .map((field) => String(field));
    return validFields.join(separator);
  }
  /**
   * Sum numeric values
   */
  static sum(fields: any[]): number {
    if (!Array.isArray(fields)) {
      throw new BadRequestException(
        'SUM transformation requires an array of numeric values',
      );
    }
    const numericFields = fields.filter(
      (field) => field !== null && field !== undefined,
    );
    for (const field of numericFields) {
      if (typeof field !== 'number' && isNaN(Number(field))) {
        throw new BadRequestException(
          `SUM transformation requires numeric values. Invalid value: ${field}`,
        );
      }
    }
    return numericFields.reduce((sum, field) => sum + Number(field), 0);
  }
  /**
   * Split a string value by delimiter
   */
  static split(field: string, delimiter = ','): string[] {
    if (typeof field !== 'string') {
      throw new BadRequestException(
        'SPLIT transformation requires a string value',
      );
    }
    if (!delimiter) {
      throw new BadRequestException(
        'SPLIT transformation requires a delimiter',
      );
    }
    return field.split(delimiter).map((part) => part.trim());
  }
  /**
   * Apply transformation based on type
   */
  static applyTransformation(
    type: 'NONE' | 'CONCAT' | 'SUM' | 'SPLIT',
    values: any[],
    options?: { separator?: string; delimiter?: string },
  ): any {
    switch (type) {
      case 'NONE':
        return values.length === 1 ? this.direct(values[0]) : values[0];
      case 'CONCAT':
        return this.concat(values, options?.separator);
      case 'SUM':
        return this.sum(values);
      case 'SPLIT':
        if (values.length !== 1) {
          throw new BadRequestException(
            'SPLIT transformation requires exactly one input value',
          );
        }
        return this.split(values[0], options?.delimiter);
      default:
        throw new BadRequestException(
          `Unknown transformation type: ${type as string}`,
        );
    }
  }
  /**
   * Validate transformation compatibility with field types
   */
  static validateTransformation(
    type: 'NONE' | 'CONCAT' | 'SUM' | 'SPLIT',
    sourceTypes: string[],
    destinationType: string,
  ): { valid: boolean; error?: string } {
    switch (type) {
      case 'NONE':
        if (sourceTypes.length === 1 && sourceTypes[0] !== destinationType) {
          return {
            valid: false,
            error: `Type mismatch: source type '${sourceTypes[0]}' cannot be directly mapped to '${destinationType}'`,
          };
        }
        break;
      case 'CONCAT':
        if (destinationType !== 'string') {
          return {
            valid: false,
            error: `CONCAT transformation requires string destination type, got '${destinationType}'`,
          };
        }
        break;
      case 'SUM': {
        const validNumericTypes = ['number', 'integer', 'float'];
        if (!validNumericTypes.includes(destinationType)) {
          return {
            valid: false,
            error: `SUM transformation requires numeric destination type, got '${destinationType}'`,
          };
        }
        const nonNumericSources = sourceTypes.filter(
          (type) => !validNumericTypes.includes(type),
        );
        if (nonNumericSources.length > 0) {
          return {
            valid: false,
            error: `SUM transformation requires all source fields to be numeric. Non-numeric types: ${nonNumericSources.join(', ')}`,
          };
        }
        break;
      }
      case 'SPLIT': {
        if (sourceTypes.length !== 1) {
          return {
            valid: false,
            error: 'SPLIT transformation requires exactly one source field',
          };
        }
        if (sourceTypes[0] !== 'string') {
          return {
            valid: false,
            error: `SPLIT transformation requires string source type, got '${sourceTypes[0]}'`,
          };
        }
        if (
          !destinationType.includes('array') &&
          destinationType !== 'string[]'
        ) {
          return {
            valid: false,
            error: `SPLIT transformation should result in array type, got '${destinationType}'`,
          };
        }
        break;
      }
    }
    return { valid: true };
  }
}
