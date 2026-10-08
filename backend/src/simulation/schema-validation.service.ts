import { Injectable, Logger } from '@nestjs/common';
import * as xml2js from 'xml2js';
import Ajv from 'ajv';
import * as _ from 'lodash';
import type { Config } from '../config/config.interfaces';
import type { SimulationError } from './dto/simulation.dto';

/**
 * Payload parsing, XML normalization and Ajv schema validation shared by
 * SimulationService (stage 3) and ConfigService (save-time schema check), so
 * both apply exactly the same rules.
 */
@Injectable()
export class SchemaValidationService {
  private readonly logger = new Logger(SchemaValidationService.name);

  /**
   * Parses the payload for its content type and validates it against the
   * schema the same way SimulationService's schema stage does: Ajv gets the
   * XML-cleaned schema, payload normalization gets the raw schema.
   */
  async validateSchemaMatchesPayload(
    payload: unknown,
    schema: unknown,
    contentType: string,
  ): Promise<SimulationError[]> {
    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = await this.parsePayload(payload, contentType);
    } catch (error: unknown) {
      return [
        {
          field: 'payload',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      ];
    }

    return this.validatePayloadAgainstSchema(
      parsedPayload,
      this.cleanSchemaForXML(schema),
      { schema } as unknown as Config,
    );
  }

  async parsePayload(
    payload: unknown,
    payloadType: string,
  ): Promise<Record<string, unknown>> {
    if (!payloadType) {
      throw new Error(
        'payloadType is required. Must be either "application/json" or "application/xml"',
      );
    }

    if (payloadType === 'application/xml') {
      const xmlString =
        typeof payload === 'string' ? payload : JSON.stringify(payload);

      if (!xmlString || xmlString.trim().length === 0) {
        throw new Error('XML payload cannot be empty');
      }

      const parser = new xml2js.Parser({
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
        trim: true,
        normalize: true,
        normalizeTags: false,
        attrkey: '@',
        charkey: '#text',
        explicitCharkey: false,
        attrNameProcessors: undefined,
        attrValueProcessors: undefined,
        tagNameProcessors: undefined,
        valueProcessors: undefined,
      });

      try {
        const result = await parser.parseStringPromise(xmlString);
        this.logger.debug(
          `XML parsed successfully: ${JSON.stringify(result).substring(0, 200)}...`,
        );
        return result;
      } catch (xmlError: unknown) {
        const errorMessage =
          xmlError instanceof Error ? xmlError.message : 'Unknown error';
        this.logger.error(`XML parsing failed: ${errorMessage}`);
        throw new Error(`Invalid XML payload: ${errorMessage}`, {
          cause: xmlError,
        });
      }
    }

    if (payloadType === 'application/json') {
      if (typeof payload === 'string') {
        try {
          return JSON.parse(payload);
        } catch (jsonError: unknown) {
          const errorMessage =
            jsonError instanceof Error ? jsonError.message : 'Unknown error';
          throw new Error(`Invalid JSON payload: ${errorMessage}`, {
            cause: jsonError,
          });
        }
      }
      return payload as Record<string, unknown>;
    }

    throw new Error(
      `Unsupported payload type: "${payloadType}". Must be either "application/json" or "application/xml"`,
    );
  }

  normalizePayloadForValidation(
    payload: Record<string, unknown>,
    config?: Config,
  ): Record<string, unknown> {
    if (this.isXmlParsedObject(payload)) {
      const normalized = this.normalizeXmlParsedObjectWithSchema(
        payload,
        config?.schema,
      );
      if (config?.schema) {
        const schemaProperties = config.schema.properties;
        if (schemaProperties) {
          const schemaRootKeys = Object.keys(schemaProperties);
          const payloadRootKeys = Object.keys(
            normalized as Record<string, unknown>,
          );

          if (
            schemaRootKeys.length === 1 &&
            !payloadRootKeys.includes(schemaRootKeys[0])
          ) {
            const [rootKey] = schemaRootKeys;
            this.logger.debug(
              `Wrapping payload with schema root element: ${rootKey}`,
            );
            return { [rootKey]: normalized };
          }
        }
      }

      return normalized as Record<string, unknown>;
    }

    return payload;
  }

  cleanSchemaForXML(schema: unknown): unknown {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const cleanedSchema: Record<string, unknown> = { ...schema };

    if (cleanedSchema.required && Array.isArray(cleanedSchema.required)) {
      const originalRequired = cleanedSchema.required as string[];
      cleanedSchema.required = (cleanedSchema.required as string[]).filter(
        (field: string) =>
          !field.startsWith('xmlns') && field !== '$' && field !== '@',
      );

      if (
        originalRequired.length !== (cleanedSchema.required as string[]).length
      ) {
        this.logger.debug(
          `Removed ${originalRequired.length - (cleanedSchema.required as string[]).length} XML attributes from required fields`,
        );
      }
    }
    if (
      cleanedSchema.properties &&
      typeof cleanedSchema.properties === 'object'
    ) {
      const cleanedProperties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(cleanedSchema.properties)) {
        if (key.startsWith('xmlns') || key.startsWith('@') || key === '$') {
          this.logger.debug(`Skipping XML attribute property: ${key}`);
          continue;
        }
        if (value && typeof value === 'object') {
          cleanedProperties[key] = this.cleanSchemaForXML(value);
        } else {
          cleanedProperties[key] = value;
        }
      }
      cleanedSchema.properties = cleanedProperties;
    }

    return cleanedSchema;
  }

  isXmlParsedObject(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }
    const hasXmlAttributes = Object.keys(obj).some((key) =>
      key.startsWith('@'),
    );
    const hasTextContent = Object.prototype.hasOwnProperty.call(obj, '#text');
    const hasNestedStructure = Object.values(obj).some(
      (val) =>
        val !== null &&
        val !== undefined &&
        typeof val === 'object' &&
        !Array.isArray(val),
    );

    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Boolean OR logic, not nullish coalescing
    return hasXmlAttributes || hasTextContent || hasNestedStructure;
  }

  normalizeXmlParsedObjectWithSchema(
    obj: unknown,
    schema?: unknown,
    path = '',
  ): unknown {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.normalizeXmlParsedObjectWithSchema(item, schema, path),
      );
    }

    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('@') || key.startsWith('xmlns') || key === '$') {
        continue;
      }
      if (key === '#text') {
        const hasAttributes = Object.keys(obj).some(
          (k) => k !== '#text' && !k.startsWith('@'),
        );
        const hasOnlyTextAndAttributes = Object.keys(obj).every(
          (k) => k === '#text' || k.startsWith('@'),
        );

        const expectedType = this.getSchemaTypeAtPath(schema, path);

        if (expectedType === 'string' && hasAttributes) {
          return value;
        }

        if (Object.keys(obj).length === 1 || hasOnlyTextAndAttributes) {
          return value;
        }
        normalized.textContent = value;
        continue;
      }
      const currentPath = path ? `${path}.${key}` : key;

      const fieldSchema = this.getSchemaAtPath(schema, currentPath);

      if (value && typeof value === 'object') {
        const normalizedValue = this.normalizeXmlParsedObjectWithSchema(
          value,
          fieldSchema,
          currentPath,
        );
        if (
          fieldSchema?.type === 'string' &&
          typeof normalizedValue === 'object' &&
          normalizedValue !== null &&
          ((normalizedValue as Record<string, unknown>).textContent !==
            undefined ||
            (normalizedValue as Record<string, unknown>)['#text'] !== undefined)
        ) {
          normalized[key] =
            (normalizedValue as Record<string, unknown>).textContent ??
            (normalizedValue as Record<string, unknown>)['#text'];
        } else {
          normalized[key] = normalizedValue;
        }
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  getSchemaTypeAtPath(schema: unknown, path: string): string | null {
    if (!schema || !path) return null;

    const parts = path.split('.');
    let current = schema as Record<string, unknown>;

    for (const part of parts) {
      const props = current.properties as Record<string, unknown> | undefined;
      if (props?.[part]) {
        current = props[part] as Record<string, unknown>;
      } else {
        return null;
      }
    }

    if (current.type === null || current.type === undefined) {
      return null;
    }
    return current.type as string;
  }

  getSchemaAtPath(
    schema: unknown,
    path: string,
  ): Record<string, unknown> | null {
    if (!schema || !path) return null;

    const parts = path.split('.');
    let current = schema as Record<string, unknown>;

    for (const part of parts) {
      const props = current.properties as Record<string, unknown> | undefined;
      if (props?.[part]) {
        current = props[part] as Record<string, unknown>;
      } else {
        return null;
      }
    }

    return current;
  }

  validatePayloadAgainstSchema(
    payload: unknown,
    schema: unknown,
    config?: Config,
  ): SimulationError[] {
    const errors: SimulationError[] = [];

    if (!schema) {
      errors.push({
        field: 'schema',
        message: 'No schema defined in configuration',
      });
      return errors;
    }

    try {
      const normalizedPayload = this.normalizePayloadForValidation(
        payload as Record<string, unknown>,
        config,
      );

      const ajv = new Ajv({
        allErrors: true,
        strict: false,
        strictSchema: false,
        strictNumbers: true,
        strictTypes: false,
        strictRequired: true,
        allowUnionTypes: true,
        validateFormats: false,
      });

      const schemaWithStrict = this.enforceStrictSchema(schema, config);

      const validate = ajv.compile(schemaWithStrict as Record<string, unknown>);

      const valid = validate(normalizedPayload);

      this.logger.debug(`Schema validation result: ${valid}`);
      this.logger.debug(
        `Payload type: ${Array.isArray(normalizedPayload) ? 'array' : typeof normalizedPayload}`,
      );

      if (!valid && validate.errors) {
        this.logger.warn(
          `Schema validation errors: ${JSON.stringify(validate.errors)}`,
        );

        for (const error of validate.errors) {
          if (
            error.keyword === 'type' &&
            error.instancePath &&
            error.instancePath.includes('/')
          ) {
            const pathSegments = error.instancePath.split('/');
            const isArrayElement = pathSegments.some((segment) =>
              /^\d+$/.test(segment),
            );

            if (isArrayElement) {
              this.logger.debug(
                `Array element type mismatch at ${error.instancePath}: expected ${String(error.schema)}, got ${typeof error.data}`,
              );
              const friendlyPath = error.instancePath
                .replace(/^\//, '')
                .replace(/\//g, '.');
              errors.push({
                field: friendlyPath,
                message: `Array element at ${friendlyPath}: expected ${String(error.schema)}, got ${typeof error.data}`,
                path: error.instancePath,
                value: error.data,
              });
              continue;
            }
          }

          errors.push({
            field: error.instancePath || 'root',
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Using || to handle empty strings
            message: error.message || 'Schema validation failed',
            path: error.instancePath,
            value: _.get(
              normalizedPayload,
              error.instancePath.replace(/^\//, '').replace(/\//g, '.'),
            ),
          });
        }
      }
    } catch (schemaError: unknown) {
      const errorMessage =
        schemaError instanceof Error ? schemaError.message : 'Unknown error';
      this.logger.error(`Schema validation error: ${errorMessage}`);
      errors.push({
        field: 'schema',
        message: 'Schema validation error: ' + errorMessage,
      });
    }

    return errors;
  }

  enforceStrictSchema(schema: unknown, config?: Config): unknown {
    if (!schema || typeof schema !== 'object') {
      return schema;
    }

    const strictSchema: Record<string, unknown> = {
      ...(schema as Record<string, unknown>),
    };

    const runtimeContextFields = ['tenantId', 'tenant_id', 'userId', 'user_id'];

    if (strictSchema.required && Array.isArray(strictSchema.required)) {
      strictSchema.required = (strictSchema.required as string[]).filter(
        (field: string) => !runtimeContextFields.includes(field),
      );
      if ((strictSchema.required as string[]).length === 0) {
        delete strictSchema.required;
      }
    }

    if (strictSchema.type === 'array') {
      if (strictSchema.items) {
        if (typeof strictSchema.items === 'object') {
          strictSchema.items = this.enforceStrictSchema(
            strictSchema.items,
            config,
          );

          const items = strictSchema.items as Record<string, unknown>;
          if (items.type === 'object') {
            items.additionalProperties = true;
          }
        }
      }
      return strictSchema;
    }

    if (strictSchema.type === 'object') {
      strictSchema.additionalProperties = true;
    }

    strictSchema.properties &&= Object.keys(strictSchema.properties).reduce<
      Record<string, unknown>
    >((acc, key) => {
      const updatedAcc = { ...acc };
      updatedAcc[key] = this.enforceStrictSchema(
        (strictSchema.properties as Record<string, unknown>)[key],
        config,
      );
      return updatedAcc;
    }, {});

    if (strictSchema.items && strictSchema.type !== 'array') {
      strictSchema.items = this.enforceStrictSchema(strictSchema.items, config);
    }
    strictSchema.oneOf &&= (strictSchema.oneOf as unknown[]).map((s: unknown) =>
      this.enforceStrictSchema(s, config),
    );
    strictSchema.anyOf &&= (strictSchema.anyOf as unknown[]).map((s: unknown) =>
      this.enforceStrictSchema(s, config),
    );
    strictSchema.allOf &&= (strictSchema.allOf as unknown[]).map((s: unknown) =>
      this.enforceStrictSchema(s, config),
    );

    return strictSchema;
  }
}
