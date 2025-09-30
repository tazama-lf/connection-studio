import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { MappingRepository } from './mapping.repository';
import {
  Mapping,
  MappingStatus,
  TransformationType,
  SourceField,
  DestinationField,
} from './mapping.entity';
import {
  CreateMappingDto,
  UpdateMappingDto,
  SourceFieldDto,
  DestinationFieldDto,
  CreateDestinationFieldDto,
  UpdateDestinationFieldDto,
  SchemaTreeNodeDto,
  SchemaTreeResponseDto,
  SchemaComparisonDto,
  SchemaComparisonResultDto,
  SchemaFieldMappingSuggestionDto,
} from './mapping.dto';
import { AuditService } from '../audit/audit.service';
import { EndpointsService } from '../endpoints/endpoints.service';
import { SchemaField, FieldType } from '../common/interfaces';
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}
export interface AuditFriendlyMapping extends Mapping {
  action: 'CREATE' | 'UPDATE' | 'ROLLBACK' | 'APPROVE' | 'PUBLISH' | 'DELETE';
  userId: string;
  timestamp: Date;
  validationErrors?: ValidationError[];
}
@Injectable()
export class MappingService {
  constructor(
    private readonly mappingRepository: MappingRepository,
    private readonly auditService: AuditService,
    private readonly endpointsService: EndpointsService,
  ) {}
  /**
   * Creates a new mapping with validation and assigns initial version
   */
  async createMapping(
    dto: CreateMappingDto,
    userId: string,
    tenantId: string,
  ): Promise<AuditFriendlyMapping> {
    if (dto.endpointId) {
      const endpointValidationErrors =
        await this.validateMappingAgainstEndpoint(
          dto,
          dto.endpointId,
          tenantId,
        );
      if (endpointValidationErrors.length > 0) {
        throw new BadRequestException({
          message: 'Mapping validation against endpoint schema failed',
          errors: endpointValidationErrors,
        });
      }
    }
    const validationErrors = await this.validateMapping(dto);
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Mapping validation failed',
        errors: validationErrors,
      });
    }
    const mappingData: CreateMappingDto = {
      ...dto,
      status: MappingStatus.IN_PROGRESS,
      createdBy: userId,
    };
    const mapping = await this.mappingRepository.create(mappingData, tenantId);
    let endpointName = 'UNKNOWN_ENDPOINT';
    if (mapping.endpointId) {
      try {
        const endpoint = await this.endpointsService.getEndpointById(
          mapping.endpointId,
          tenantId,
        );
        if (endpoint) {
          endpointName = `${endpoint.method} ${endpoint.path} v${endpoint.version}`;
        }
      } catch {
        // Silently ignore endpoint retrieval errors for audit logging
      }
    }
    await this.auditService.logMappingAction({
      action: 'CREATE',
      actor: userId,
      tenantId,
      mappingName: mapping.name,
      endpointName,
      version: mapping.version,
    });
    return {
      ...mapping,
      action: 'CREATE',
      userId,
      timestamp: new Date(),
    };
  }
  /**
   * Updates an existing mapping, increments version, and logs update
   */
  async updateMapping(
    id: string,
    dto: UpdateMappingDto,
    userId: string,
    tenantId: string,
  ): Promise<AuditFriendlyMapping> {
    const existingMapping = await this.mappingRepository.findById(id, tenantId);
    if (!existingMapping) {
      throw new NotFoundException(`Mapping with id ${id} not found`);
    }
    if (existingMapping.status !== MappingStatus.IN_PROGRESS) {
      throw new ConflictException(
        'Can only update mappings with IN_PROGRESS status',
      );
    }
    const completeDto: CreateMappingDto = {
      name: dto.name ?? existingMapping.name,
      sourceFields: dto.sourceFields ?? existingMapping.sourceFields,
      destinationFields:
        dto.destinationFields ?? existingMapping.destinationFields,
      transformation: dto.transformation ?? existingMapping.transformation,
      constants: dto.constants ?? existingMapping.constants ?? undefined,
      createdBy: existingMapping.createdBy,
      status: dto.status ?? existingMapping.status,
    };
    const validationErrors = await this.validateMapping(completeDto);
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Mapping validation failed',
        errors: validationErrors,
      });
    }
    let updatedMapping: Mapping;
    if (dto.name && dto.name !== existingMapping.name) {
      const newMappingDto: CreateMappingDto = {
        ...completeDto,
        createdBy: userId,
      };
      updatedMapping = await this.mappingRepository.create(
        newMappingDto,
        tenantId,
      );
    } else {
      updatedMapping = await this.mappingRepository.update(id, dto, tenantId);
    }
    await this.auditService.logMappingAction({
      action: 'UPDATE',
      actor: userId,
      tenantId,
      mappingName: updatedMapping.name,
      version: updatedMapping.version,
    });
    return {
      ...updatedMapping,
      action: 'UPDATE',
      userId,
      timestamp: new Date(),
    };
  }
  /**
   * Gets complete mapping history for a given name, sorted by version descending
   */
  async getMappingHistory(name: string, tenantId: string): Promise<Mapping[]> {
    const mappings = await this.mappingRepository.findByName(name, tenantId);
    if (mappings.length === 0) {
      throw new NotFoundException(`No mappings found with name: ${name}`);
    }
    return mappings;
  }
  /**
   * Rollbacks a mapping to a previous version by cloning it as a new IN_PROGRESS mapping
   */
  async rollbackMapping(
    id: string,
    targetVersion: number,
    userId: string,
    tenantId: string,
  ): Promise<AuditFriendlyMapping> {
    const currentMapping = await this.mappingRepository.findById(id, tenantId);
    if (!currentMapping) {
      throw new NotFoundException(`Mapping with id ${id} not found`);
    }
    const mappingHistory = await this.getMappingHistory(
      currentMapping.name,
      tenantId,
    );
    const targetMapping = mappingHistory.find(
      (m) => m.version === targetVersion,
    );
    if (!targetMapping) {
      throw new NotFoundException(
        `Version ${targetVersion} not found for mapping: ${currentMapping.name}`,
      );
    }
    if (targetVersion >= currentMapping.version) {
      throw new BadRequestException(
        `Cannot rollback to version ${targetVersion}. Must be older than current version ${currentMapping.version}`,
      );
    }
    const rollbackDto: CreateMappingDto = {
      name: targetMapping.name,
      sourceFields: targetMapping.sourceFields,
      destinationFields: targetMapping.destinationFields,
      transformation: targetMapping.transformation,
      constants: targetMapping.constants ?? undefined,
      status: MappingStatus.IN_PROGRESS,
      createdBy: userId,
    };
    const rolledBackMapping = await this.mappingRepository.create(
      rollbackDto,
      tenantId,
    );
    await this.auditService.logMappingAction({
      action: 'ROLLBACK',
      actor: userId,
      tenantId,
      mappingName: rolledBackMapping.name,
      version: rolledBackMapping.version,
    });
    return {
      ...rolledBackMapping,
      action: 'ROLLBACK',
      userId,
      timestamp: new Date(),
    };
  }
  /**
   * Validates mapping configuration for type compatibility and business rules
   */
  async validateMapping(dto: CreateMappingDto): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    if (!dto.name || dto.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Mapping name is required',
        code: 'REQUIRED_FIELD_MISSING',
      });
    }
    if (!dto.sourceFields || dto.sourceFields.length === 0) {
      errors.push({
        field: 'sourceFields',
        message: 'At least one source field is required',
        code: 'REQUIRED_FIELD_MISSING',
      });
    }
    if (!dto.destinationFields || dto.destinationFields.length === 0) {
      errors.push({
        field: 'destinationFields',
        message: 'At least one destination field is required',
        code: 'REQUIRED_FIELD_MISSING',
      });
    }
    if (errors.length > 0) {
      return errors;
    }
    const destinationPaths = dto.destinationFields.map((df) => df.path);
    const duplicatePaths = destinationPaths.filter(
      (path, index) => destinationPaths.indexOf(path) !== index,
    );
    if (duplicatePaths.length > 0) {
      errors.push({
        field: 'destinationFields',
        message: `Duplicate destination fields found: ${duplicatePaths.join(', ')}`,
        code: 'DUPLICATE_DESTINATIONS',
      });
    }
    this.validateTypeCompatibility(dto, errors);
    this.validateRequiredFieldMappings(dto, errors);
    this.validateTransformationRules(dto, errors);
    return errors;
  }
  /**
   * Validates type compatibility between source and destination fields
   */
  private validateTypeCompatibility(
    dto: CreateMappingDto,
    errors: ValidationError[],
  ): void {
    for (const destField of dto.destinationFields) {
      if (dto.transformation === TransformationType.CONCAT) {
        if ((destField.type as FieldType) !== FieldType.STRING) {
          errors.push({
            field: `destinationFields.${destField.path}`,
            message: 'CONCAT transformation requires string destination type',
            code: 'TYPE_MISMATCH',
          });
        }
      } else if (dto.transformation === TransformationType.SUM) {
        if ((destField.type as FieldType) !== FieldType.NUMBER) {
          errors.push({
            field: `destinationFields.${destField.path}`,
            message: 'SUM transformation requires numeric destination type',
            code: 'TYPE_MISMATCH',
          });
        }
        const nonNumericSources = dto.sourceFields.filter(
          (sf) => (sf.type as FieldType) !== FieldType.NUMBER,
        );
        if (nonNumericSources.length > 0) {
          errors.push({
            field: 'sourceFields',
            message: `SUM transformation requires all source fields to be numeric. Non-numeric fields: ${nonNumericSources.map((s) => s.path).join(', ')}`,
            code: 'TYPE_MISMATCH',
          });
        }
      } else if (dto.transformation === TransformationType.NONE) {
        if (
          dto.sourceFields.length === 1 &&
          dto.destinationFields.length === 1
        ) {
          const sourceType = dto.sourceFields[0].type;
          const destType = destField.type;
          if (!this.areTypesCompatible(sourceType, destType)) {
            errors.push({
              field: `destinationFields.${destField.path}`,
              message: `Type mismatch: cannot map ${sourceType} to ${destType}`,
              code: 'TYPE_MISMATCH',
            });
          }
        }
      }
    }
  }
  /**
   * Validates that all required destination fields have corresponding mappings
   */
  private validateRequiredFieldMappings(
    dto: CreateMappingDto,
    errors: ValidationError[],
  ): void {
    const requiredDestFields = dto.destinationFields.filter(
      (df) => df.isRequired,
    );
    for (const requiredField of requiredDestFields) {
      const hasSourceMapping = dto.sourceFields.length > 0;
      const hasConstantValue =
        dto.constants && Object.keys(dto.constants).length > 0;
      if (!hasSourceMapping && !hasConstantValue) {
        errors.push({
          field: `destinationFields.${requiredField.path}`,
          message: `Required destination field '${requiredField.path}' has no source mapping or constant value`,
          code: 'REQUIRED_FIELD_NOT_MAPPED',
        });
      }
    }
  }
  /**
   * Validates transformation-specific business rules
   */
  private validateTransformationRules(
    dto: CreateMappingDto,
    errors: ValidationError[],
  ): void {
    switch (dto.transformation) {
      case TransformationType.CONCAT:
        if (dto.sourceFields.length < 2) {
          errors.push({
            field: 'sourceFields',
            message: 'CONCAT transformation requires at least 2 source fields',
            code: 'INSUFFICIENT_SOURCE_FIELDS',
          });
        }
        break;
      case TransformationType.SUM:
        if (dto.sourceFields.length < 2) {
          errors.push({
            field: 'sourceFields',
            message: 'SUM transformation requires at least 2 source fields',
            code: 'INSUFFICIENT_SOURCE_FIELDS',
          });
        }
        break;
      case TransformationType.SPLIT:
        if (dto.sourceFields.length !== 1) {
          errors.push({
            field: 'sourceFields',
            message: 'SPLIT transformation requires exactly 1 source field',
            code: 'INVALID_SOURCE_FIELD_COUNT',
          });
        }
        if (dto.destinationFields.length < 2) {
          errors.push({
            field: 'destinationFields',
            message:
              'SPLIT transformation requires at least 2 destination fields',
            code: 'INSUFFICIENT_DESTINATION_FIELDS',
          });
        }
        break;
    }
  }
  /**
   * Checks if two types are compatible for direct mapping
   */
  private areTypesCompatible(sourceType: string, destType: string): boolean {
    if (sourceType === destType) return true;
    const numericTypes = ['number', 'integer', 'float'];
    if (numericTypes.includes(sourceType) && numericTypes.includes(destType)) {
      return true;
    }
    if (destType === 'string') return true;
    if (sourceType === 'boolean' && destType === 'boolean') return true;
    return false;
  }
  async create(
    createMappingDto: CreateMappingDto,
    tenantId: string,
  ): Promise<AuditFriendlyMapping> {
    const result = await this.createMapping(
      createMappingDto,
      createMappingDto.createdBy || 'system',
      tenantId,
    );
    return result;
  }
  async findAll(tenantId: string): Promise<Mapping[]> {
    return this.mappingRepository.findAll(tenantId);
  }
  async findOne(id: string, tenantId: string): Promise<Mapping | null> {
    return await this.mappingRepository.findById(id, tenantId);
  }
  async findByName(name: string, tenantId: string): Promise<Mapping[]> {
    return await this.mappingRepository.findByName(name, tenantId);
  }
  async findLatestByName(
    name: string,
    tenantId: string,
  ): Promise<Mapping | null> {
    return this.mappingRepository.findLatestByName(name, tenantId);
  }
  async update(
    id: string,
    updateMappingDto: UpdateMappingDto,
    tenantId: string,
  ): Promise<Mapping> {
    return this.mappingRepository.update(id, updateMappingDto, tenantId);
  }
  async remove(id: string, userId: string, tenantId: string): Promise<void> {
    const mapping = await this.mappingRepository.findById(id, tenantId);
    if (!mapping) {
      throw new NotFoundException(`Mapping with id ${id} not found`);
    }
    await this.mappingRepository.delete(id, tenantId);
    await this.auditService.logMappingAction({
      action: 'DELETE',
      actor: userId,
      tenantId,
      mappingName: mapping.name,
      version: mapping.version,
    });
  }
  async getNextVersion(name: string, tenantId: string): Promise<number> {
    return this.mappingRepository.getNextVersion(name, tenantId);
  }
  /**
   * Updates mapping status with audit logging
   */
  async updateStatus(
    id: string,
    status: MappingStatus,
    userId: string,
    tenantId: string,
  ): Promise<AuditFriendlyMapping> {
    const existingMapping = await this.mappingRepository.findById(id, tenantId);
    if (!existingMapping) {
      throw new NotFoundException(`Mapping with id ${id} not found`);
    }
    const updateDto: UpdateMappingDto = { status };
    const updatedMapping = await this.mappingRepository.update(
      id,
      updateDto,
      tenantId,
    );
    let action: 'APPROVE' | 'PUBLISH' = 'APPROVE';
    if (status === MappingStatus.PUBLISHED) {
      action = 'PUBLISH';
    }
    await this.auditService.logMappingAction({
      action,
      actor: userId,
      tenantId,
      mappingName: updatedMapping.name,
      version: updatedMapping.version,
    });
    return {
      ...updatedMapping,
      action,
      userId,
      timestamp: new Date(),
    };
  }
  /**
   * Gets audit logs for a specific mapping
   */
  async getMappingAuditLogs(
    mappingId: string,
    tenantId: string,
    limit = 50,
    _offset = 0,
  ): Promise<any[]> {
    return this.auditService.getAuditLogsByName(mappingId, tenantId, limit);
  }
  /**
   * Simulates mapping transformation on a given payload
   * Returns transformed payload with comprehensive validation results including schema validation
   */
  async simulate(
    mappingDto: CreateMappingDto,
    payload: { [key: string]: any },
  ): Promise<{
    success: boolean;
    transformedPayload: { [key: string]: any } | null;
    validationErrors: ValidationError[];
    schemaValidationErrors: ValidationError[];
    transformationDetails: {
      appliedTransformations: string[];
      fieldsProcessed: number;
      constantsApplied: { [key: string]: any };
      originalPayload: { [key: string]: any };
    };
  }> {
    const mappingValidationErrors = await this.validateMapping(mappingDto);
    let schemaValidationErrors: ValidationError[] = [];
    if (mappingDto.endpointId) {
      schemaValidationErrors = await this.validateMappingAgainstEndpoint(
        mappingDto,
        mappingDto.endpointId,
        'system',
      );
    }
    if (mappingValidationErrors.length > 0) {
      return {
        success: false,
        transformedPayload: null,
        validationErrors: mappingValidationErrors,
        schemaValidationErrors,
        transformationDetails: {
          appliedTransformations: [],
          fieldsProcessed: 0,
          constantsApplied: {},
          originalPayload: payload,
        },
      };
    }
    const transformedPayload: { [key: string]: any } = {};
    const validationErrors: ValidationError[] = [];
    const appliedTransformations: string[] = [];
    const constantsApplied: { [key: string]: any } = {};
    let fieldsProcessed = 0;
    try {
      for (const destField of mappingDto.destinationFields) {
        const sourceValues: any[] = [];
        let hasAllRequiredSources = true;
        for (const sourceField of mappingDto.sourceFields) {
          const value = this.getValueFromPath(payload, sourceField.path);
          if (value === undefined || value === null) {
            if (sourceField.isRequired) {
              hasAllRequiredSources = false;
              validationErrors.push({
                field: sourceField.path,
                message: `Required source field '${sourceField.path}' is missing from payload`,
                code: 'REQUIRED_SOURCE_MISSING',
              });
            }
          } else {
            sourceValues.push(value);
          }
        }
        if (hasAllRequiredSources || sourceValues.length > 0) {
          let transformedValue: any;
          switch (mappingDto.transformation) {
            case TransformationType.NONE:
              transformedValue = sourceValues[0];
              appliedTransformations.push(`NONE: ${destField.path}`);
              break;
            case TransformationType.CONCAT: {
              const separator = mappingDto.constants?.separator || ' ';
              transformedValue = sourceValues
                .filter((v) => v !== null && v !== undefined)
                .join(separator);
              appliedTransformations.push(
                `CONCAT: ${destField.path} (separator: "${separator}")`,
              );
              break;
            }
            case TransformationType.SUM: {
              const numericValues = sourceValues.filter(
                (v) => typeof v === 'number' || !isNaN(Number(v)),
              );
              transformedValue = numericValues.reduce(
                (sum, val) => sum + Number(val),
                0,
              );
              appliedTransformations.push(
                `SUM: ${destField.path} (${numericValues.length} values)`,
              );
              break;
            }
            case TransformationType.SPLIT: {
              const sourceValue = sourceValues[0];
              const splitSeparator =
                mappingDto.constants?.splitSeparator || ',';
              transformedValue =
                typeof sourceValue === 'string'
                  ? sourceValue.split(splitSeparator).map((s) => s.trim())
                  : sourceValue;
              appliedTransformations.push(
                `SPLIT: ${destField.path} (separator: "${splitSeparator}")`,
              );
              break;
            }
            default:
              transformedValue = sourceValues[0];
          }
          if (mappingDto.constants && destField.path in mappingDto.constants) {
            transformedValue = mappingDto.constants[destField.path];
            constantsApplied[destField.path] = transformedValue;
            appliedTransformations.push(
              `CONSTANT: ${destField.path} = ${transformedValue}`,
            );
          }
          const typeValidationError = this.validateFieldType(
            transformedValue,
            destField.type,
            destField.path,
          );
          if (typeValidationError) {
            validationErrors.push(typeValidationError);
          }
          this.setValueAtPath(
            transformedPayload,
            destField.path,
            transformedValue,
          );
          fieldsProcessed++;
        }
        if (
          destField.isRequired &&
          this.getValueFromPath(transformedPayload, destField.path) ===
            undefined
        ) {
          validationErrors.push({
            field: destField.path,
            message: `Required destination field '${destField.path}' could not be populated`,
            code: 'REQUIRED_DESTINATION_MISSING',
          });
        }
      }
      return {
        success:
          validationErrors.length === 0 && schemaValidationErrors.length === 0,
        transformedPayload:
          validationErrors.length === 0 && schemaValidationErrors.length === 0
            ? transformedPayload
            : null,
        validationErrors,
        schemaValidationErrors,
        transformationDetails: {
          appliedTransformations,
          fieldsProcessed,
          constantsApplied,
          originalPayload: payload,
        },
      };
    } catch (error) {
      return {
        success: false,
        transformedPayload: null,
        validationErrors: [
          {
            field: 'transformation',
            message: `Transformation failed: ${error.message}`,
            code: 'TRANSFORMATION_ERROR',
          },
        ],
        schemaValidationErrors,
        transformationDetails: {
          appliedTransformations,
          fieldsProcessed,
          constantsApplied,
          originalPayload: payload,
        },
      };
    }
  }
  /**
   * Validates field type compatibility
   */
  private validateFieldType(
    value: any,
    expectedType: string,
    fieldPath: string,
  ): ValidationError | null {
    const actualType = typeof value;
    const typeCompatible = (actual: string, expected: string): boolean => {
      if (expected === 'string') return true;
      if (expected === 'number' || expected === 'integer') {
        return actual === 'number' || !isNaN(Number(value));
      }
      if (expected === 'boolean') {
        return (
          actual === 'boolean' ||
          value === 'true' ||
          value === 'false' ||
          value === 1 ||
          value === 0
        );
      }
      if (expected === 'array') return Array.isArray(value);
      if (expected === 'object')
        return actual === 'object' && !Array.isArray(value);
      return actual === expected;
    };
    if (!typeCompatible(actualType, expectedType)) {
      return {
        field: fieldPath,
        message: `Type mismatch: expected '${expectedType}' but got '${actualType}' for value: ${JSON.stringify(value)}`,
        code: 'TYPE_MISMATCH',
      };
    }
    return null;
  }
  /**
   * Gets a value from a nested object using dot notation path
   */
  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
  /**
   * Sets a value in a nested object using dot notation path
   */
  private setValueAtPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    for (const key of keys) {
      if (!current[key]) {
        current[key] = {};
      }
      current = current[key];
    }
    if (lastKey) {
      current[lastKey] = value;
    }
  }
  /**
   * Exports a mapping configuration as a downloadable JSON package
   * Includes mapping, extensions, schema, and computed SHA256 hash
   */
  async exportMappingConfig(
    id: string,
    userId: string,
    tenantId: string,
  ): Promise<{
    success: boolean;
    data: {
      package: any;
      checksum: string;
      filename: string;
    } | null;
    message: string;
  }> {
    try {
      const mapping = await this.mappingRepository.findById(id, tenantId);
      if (!mapping) {
        throw new NotFoundException(`Mapping with id ${id} not found`);
      }
      const extensions: any[] = [];
      const now = new Date();
      const packageMeta = {
        packageVersion: '1.0.0',
        exportedAt: now.toISOString(),
        exportedBy: userId,
        mappingId: mapping.id,
        mappingVersion: mapping.version,
        checksum: '',
      };
      const packageData = {
        meta: packageMeta,
        mapping: {
          id: mapping.id,
          name: mapping.name,
          version: mapping.version,
          status: mapping.status,
          sourceFields: mapping.sourceFields,
          destinationFields: mapping.destinationFields,
          transformation: mapping.transformation,
          constants: mapping.constants,
          createdBy: mapping.createdBy,
          createdAt: mapping.createdAt,
          updatedAt: mapping.updatedAt,
        },
        transformations: {
          type: mapping.transformation,
          config: mapping.constants,
        },
        constants: mapping.constants || {},
        extensions,
        schema: {
          sourceSchema: this.inferSchemaFromFields(mapping.sourceFields),
          destinationSchema: this.inferSchemaFromFields(
            mapping.destinationFields,
          ),
        },
      };
      const crypto = require('crypto');
      const packageString = JSON.stringify(packageData, null, 0);
      const checksum = crypto
        .createHash('sha256')
        .update(packageString)
        .digest('hex');
      packageData.meta.checksum = checksum;
      const filename = `mapping-${mapping.name.replace(/[^a-zA-Z0-9]/g, '-')}-v${mapping.version}-${now.toISOString().split('T')[0]}.json`;
      await this.auditService.logMappingAction({
        action: 'CREATE',
        actor: userId,
        tenantId,
        mappingName: mapping.name,
        version: mapping.version,
      });
      return {
        success: true,
        data: {
          package: packageData,
          checksum,
          filename,
        },
        message: 'Mapping package exported successfully',
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Export failed: ${error.message}`,
      };
    }
  }
  /**
   * Imports a mapping configuration package and creates a new version
   * Validates hash and persists as new version
   */
  async importMappingConfig(
    packageData: any,
    userId: string,
    tenantId: string,
  ): Promise<{
    success: boolean;
    data: AuditFriendlyMapping | null;
    message: string;
    validationErrors: ValidationError[];
  }> {
    const validationErrors: ValidationError[] = [];
    try {
      if (!packageData.meta || !packageData.mapping) {
        validationErrors.push({
          field: 'package',
          message: 'Invalid package structure: missing meta or mapping data',
          code: 'INVALID_PACKAGE_STRUCTURE',
        });
      }
      if (packageData.meta?.checksum) {
        const crypto = require('crypto');
        const originalChecksum = packageData.meta.checksum;
        const packageCopy = { ...packageData };
        packageCopy.meta = { ...packageCopy.meta };
        delete packageCopy.meta.checksum;
        const packageString = JSON.stringify(packageCopy, null, 0);
        const computedChecksum = crypto
          .createHash('sha256')
          .update(packageString)
          .digest('hex');
        if (computedChecksum !== originalChecksum) {
          validationErrors.push({
            field: 'checksum',
            message: 'Package integrity check failed: checksum mismatch',
            code: 'CHECKSUM_MISMATCH',
          });
        }
      }
      if (validationErrors.length > 0) {
        return {
          success: false,
          data: null,
          message: 'Package validation failed',
          validationErrors,
        };
      }
      const importedMapping = packageData.mapping;
      const createDto: CreateMappingDto = {
        name: `${importedMapping.name} (Imported)`,
        sourceFields: importedMapping.sourceFields,
        destinationFields: importedMapping.destinationFields,
        transformation: importedMapping.transformation,
        constants: importedMapping.constants,
        status: MappingStatus.IN_PROGRESS,
        createdBy: userId,
      };
      const mappingValidationErrors = await this.validateMapping(createDto);
      if (mappingValidationErrors.length > 0) {
        return {
          success: false,
          data: null,
          message: 'Imported mapping validation failed',
          validationErrors: mappingValidationErrors,
        };
      }
      const newMapping = await this.mappingRepository.create(
        createDto,
        tenantId,
      );
      await this.auditService.logMappingAction({
        action: 'CREATE',
        actor: userId,
        tenantId,
        mappingName: newMapping.name,
        version: newMapping.version,
      });
      return {
        success: true,
        data: {
          ...newMapping,
          action: 'CREATE',
          userId,
          timestamp: new Date(),
        },
        message: 'Mapping package imported successfully',
        validationErrors: [],
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Import failed: ${error.message}`,
        validationErrors: [
          {
            field: 'import',
            message: `Import error: ${error.message}`,
            code: 'IMPORT_ERROR',
          },
        ],
      };
    }
  }
  /**
   * Infers schema structure from field definitions
   */
  private inferSchemaFromFields(
    fields: SourceField[] | DestinationField[],
  ): any {
    const schema: any = {
      type: 'object',
      properties: {},
      required: [],
    };
    for (const field of fields) {
      if (field.isRequired) {
        schema.required.push(field.path);
      }
      this.setSchemaProperty(schema.properties, field.path, {
        type: this.mapFieldTypeToJsonSchema(field.type),
        description: `Field: ${field.path}`,
      });
    }
    return schema;
  }
  /**
   * Sets a property in the schema using dot notation path
   */
  private setSchemaProperty(
    schemaProps: any,
    path: string,
    fieldSchema: any,
  ): void {
    const keys = path.split('.');
    let current = schemaProps;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) {
        current[key] = {
          type: 'object',
          properties: {},
        };
      }
      current = current[key].properties;
    }
    const lastKey = keys[keys.length - 1];
    current[lastKey] = fieldSchema;
  }
  /**
   * Comprehensive validation of mapping against endpoint schema
   * Validates that source fields exist in endpoint schema and required fields are covered
   */
  private async validateMappingAgainstEndpoint(
    dto: CreateMappingDto,
    endpointId: number,
    tenantId: string,
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    try {
      const endpoint = await this.endpointsService.getEndpointById(
        endpointId,
        tenantId,
      );
      if (!endpoint) {
        errors.push({
          field: 'endpointId',
          message: `Endpoint with id ${endpointId} not found`,
          code: 'ENDPOINT_NOT_FOUND',
        });
        return errors;
      }
      if (!endpoint.currentSchema?.fields) {
        errors.push({
          field: 'endpointId',
          message: `Endpoint ${endpointId} has no schema defined`,
          code: 'ENDPOINT_NO_SCHEMA',
        });
        return errors;
      }
      const endpointFields = endpoint.currentSchema.fields;
      const endpointFieldPaths = this.extractFieldPaths(endpointFields);
      const endpointFieldMap = new Map(
        endpointFieldPaths.map((field) => [
          field.path,
          { type: field.type.toLowerCase(), isRequired: field.isRequired },
        ]),
      );
      for (const sourceField of dto.sourceFields) {
        const endpointField = endpointFieldMap.get(sourceField.path);
        if (!endpointField) {
          errors.push({
            field: `sourceFields.${sourceField.path}`,
            message: `Source field '${sourceField.path}' not found in endpoint schema`,
            code: 'SOURCE_FIELD_NOT_IN_ENDPOINT',
          });
        } else if (endpointField.type !== sourceField.type.toLowerCase()) {
          errors.push({
            field: `sourceFields.${sourceField.path}`,
            message: `Source field '${sourceField.path}' type mismatch. Expected '${endpointField.type}', got '${sourceField.type}'`,
            code: 'SOURCE_FIELD_TYPE_MISMATCH',
          });
        }
      }
      const sourcePathCounts = new Map<string, number>();
      for (const sourceField of dto.sourceFields) {
        const count = sourcePathCounts.get(sourceField.path) || 0;
        sourcePathCounts.set(sourceField.path, count + 1);
      }
      for (const [path, count] of sourcePathCounts.entries()) {
        if (count > 1) {
          errors.push({
            field: 'sourceFields',
            message: `Duplicate source field path '${path}' detected`,
            code: 'DUPLICATE_SOURCE_FIELD',
          });
        }
      }
      const destinationPathCounts = new Map<string, number>();
      for (const destField of dto.destinationFields) {
        const count = destinationPathCounts.get(destField.path) || 0;
        destinationPathCounts.set(destField.path, count + 1);
      }
      for (const [path, count] of destinationPathCounts.entries()) {
        if (count > 1) {
          errors.push({
            field: `destinationFields.${path}`,
            message: `Duplicate destination field '${path}' found in mapping`,
            code: 'DUPLICATE_DESTINATION_FIELD',
          });
        }
      }
      if (
        dto.transformation &&
        dto.transformation !== TransformationType.NONE
      ) {
        const transformationValidation =
          this.validateTransformationAgainstFields(
            dto.transformation,
            dto.sourceFields,
            dto.destinationFields[0],
          );
        if (!transformationValidation.valid) {
          errors.push({
            field: 'transformation',
            message:
              transformationValidation.error ||
              'Invalid transformation configuration',
            code: 'INVALID_TRANSFORMATION',
          });
        }
      }
    } catch (error) {
      errors.push({
        field: 'endpointId',
        message: `Failed to validate against endpoint: ${error.message}`,
        code: 'ENDPOINT_VALIDATION_ERROR',
      });
    }
    return errors;
  }
  /**
   * Validates transformation compatibility with source and destination fields
   */
  private validateTransformationAgainstFields(
    transformation: TransformationType,
    sourceFields: SourceFieldDto[],
    destinationField: DestinationFieldDto,
  ): { valid: boolean; error?: string } {
    switch (transformation) {
      case TransformationType.CONCAT:
        if (
          !destinationField ||
          (destinationField.type as FieldType) !== FieldType.STRING
        ) {
          return {
            valid: false,
            error: 'CONCAT transformation requires string destination type',
          };
        }
        break;
      case TransformationType.SUM: {
        const nonNumericSources = sourceFields.filter(
          (field) => (field.type as FieldType) !== FieldType.NUMBER,
        );
        if (nonNumericSources.length > 0) {
          return {
            valid: false,
            error:
              'SUM transformation requires all source fields to be numeric',
          };
        }
        if (
          !destinationField ||
          (destinationField.type as FieldType) !== FieldType.NUMBER
        ) {
          return {
            valid: false,
            error: 'SUM transformation requires numeric destination type',
          };
        }
        break;
      }
      case TransformationType.SPLIT:
        if (sourceFields.length !== 1) {
          return {
            valid: false,
            error: 'SPLIT transformation requires exactly one source field',
          };
        }
        if ((sourceFields[0].type as FieldType) !== FieldType.STRING) {
          return {
            valid: false,
            error: 'SPLIT transformation requires string source type',
          };
        }
        if (!destinationField?.type.toLowerCase().includes('array')) {
          return {
            valid: false,
            error: 'SPLIT transformation should result in array type',
          };
        }
        break;
    }
    return { valid: true };
  }
  /**
   * Recursively extracts all field paths from schema fields
   */
  private extractFieldPaths(
    fields: any[],
    parentPath = '',
  ): Array<{ path: string; type: string; isRequired: boolean }> {
    const result: Array<{ path: string; type: string; isRequired: boolean }> =
      [];
    for (const field of fields) {
      const fieldPath = parentPath ? `${parentPath}.${field.name}` : field.name;
      result.push({
        path: fieldPath,
        type: field.type,
        isRequired: field.isRequired || false,
      });
      if (field.children && field.children.length > 0) {
        result.push(...this.extractFieldPaths(field.children, fieldPath));
      }
    }
    return result;
  }
  /**
   * Maps internal field types to JSON Schema types
   */
  private mapFieldTypeToJsonSchema(fieldType: string): string {
    switch (fieldType.toLowerCase()) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      default:
        return 'string';
    }
  }
  /**
   * Creates a new custom destination field definition
   */
  async createDestinationField(
    dto: CreateDestinationFieldDto,
    userId: string,
  ): Promise<{
    success: boolean;
    data: DestinationField | null;
    message: string;
    validationErrors: ValidationError[];
  }> {
    const validationErrors: ValidationError[] = [];
    try {
      if (!this.isValidFieldPath(dto.path)) {
        validationErrors.push({
          field: 'path',
          message:
            'Invalid field path format. Use dot notation (e.g., user.profile.email)',
          code: 'INVALID_PATH_FORMAT',
        });
      }
      const allowedTypes = [
        'string',
        'number',
        'integer',
        'boolean',
        'array',
        'object',
        'date',
        'datetime',
      ];
      if (!allowedTypes.includes(dto.type.toLowerCase())) {
        validationErrors.push({
          field: 'type',
          message: `Invalid field type. Allowed types: ${allowedTypes.join(', ')}`,
          code: 'INVALID_FIELD_TYPE',
        });
      }
      if (dto.defaultValue !== undefined) {
        const typeError = this.validateFieldType(
          dto.defaultValue,
          dto.type,
          dto.path,
        );
        if (typeError) {
          validationErrors.push(typeError);
        }
      }
      if (dto.validationRules) {
        const rulesErrors = this.validateFieldValidationRules(
          dto.type,
          dto.validationRules,
        );
        validationErrors.push(...rulesErrors);
      }
      if (validationErrors.length > 0) {
        return {
          success: false,
          data: null,
          message: 'Field validation failed',
          validationErrors,
        };
      }
      const destinationField: DestinationField = {
        path: dto.path,
        type: dto.type.toLowerCase(),
        isRequired: dto.isRequired,
      };
      await this.auditService.logMappingAction({
        action: 'CREATE',
        actor: userId,
        tenantId: 'system',
        mappingName: `custom-field-${dto.name}`,
        version: 1,
      });
      return {
        success: true,
        data: destinationField,
        message: 'Destination field created successfully',
        validationErrors: [],
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Field creation failed: ${error.message}`,
        validationErrors: [
          {
            field: 'creation',
            message: `Creation error: ${error.message}`,
            code: 'CREATION_ERROR',
          },
        ],
      };
    }
  }
  /**
   * Updates an existing custom destination field definition
   */
  async updateDestinationField(
    fieldPath: string,
    dto: UpdateDestinationFieldDto,
    userId: string,
  ): Promise<{
    success: boolean;
    data: DestinationField | null;
    message: string;
    validationErrors: ValidationError[];
  }> {
    const validationErrors: ValidationError[] = [];
    try {
      if (
        dto.type &&
        ![
          'string',
          'number',
          'integer',
          'boolean',
          'array',
          'object',
          'date',
          'datetime',
        ].includes(dto.type.toLowerCase())
      ) {
        validationErrors.push({
          field: 'type',
          message: 'Invalid field type',
          code: 'INVALID_FIELD_TYPE',
        });
      }
      if (dto.defaultValue !== undefined && dto.type) {
        const typeError = this.validateFieldType(
          dto.defaultValue,
          dto.type,
          fieldPath,
        );
        if (typeError) {
          validationErrors.push(typeError);
        }
      }
      if (validationErrors.length > 0) {
        return {
          success: false,
          data: null,
          message: 'Field update validation failed',
          validationErrors,
        };
      }
      const updatedField: DestinationField = {
        path: fieldPath,
        type: dto.type?.toLowerCase() || 'string',
        isRequired: dto.isRequired ?? false,
      };
      await this.auditService.logMappingAction({
        action: 'UPDATE',
        actor: userId,
        tenantId: 'system',
        mappingName: `custom-field-${fieldPath}`,
        version: 1,
      });
      return {
        success: true,
        data: updatedField,
        message: 'Destination field updated successfully',
        validationErrors: [],
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Field update failed: ${error.message}`,
        validationErrors: [
          {
            field: 'update',
            message: `Update error: ${error.message}`,
            code: 'UPDATE_ERROR',
          },
        ],
      };
    }
  }
  /**
   * Gets available data model extension templates
   */
  async getDataModelExtensionTemplates(): Promise<{
    success: boolean;
    data: any[];
    message: string;
  }> {
    const templates = [
      {
        id: 'user-profile',
        name: 'User Profile Extension',
        description: 'Common user profile fields',
        fields: [
          { path: 'profile.firstName', type: 'string', isRequired: true },
          { path: 'profile.lastName', type: 'string', isRequired: true },
          { path: 'profile.email', type: 'string', isRequired: true },
          { path: 'profile.phone', type: 'string', isRequired: false },
          { path: 'profile.dateOfBirth', type: 'date', isRequired: false },
        ],
      },
      {
        id: 'transaction-metadata',
        name: 'Transaction Metadata Extension',
        description: 'Additional transaction tracking fields',
        fields: [
          {
            path: 'metadata.processingTime',
            type: 'datetime',
            isRequired: false,
          },
          { path: 'metadata.riskScore', type: 'number', isRequired: false },
          { path: 'metadata.channel', type: 'string', isRequired: true },
          { path: 'metadata.deviceId', type: 'string', isRequired: false },
          { path: 'metadata.location', type: 'object', isRequired: false },
        ],
      },
      {
        id: 'audit-trail',
        name: 'Audit Trail Extension',
        description: 'Audit and compliance tracking fields',
        fields: [
          { path: 'audit.createdBy', type: 'string', isRequired: true },
          { path: 'audit.createdAt', type: 'datetime', isRequired: true },
          { path: 'audit.modifiedBy', type: 'string', isRequired: false },
          { path: 'audit.modifiedAt', type: 'datetime', isRequired: false },
          { path: 'audit.version', type: 'integer', isRequired: true },
        ],
      },
    ];
    return {
      success: true,
      data: templates,
      message: 'Data model extension templates retrieved successfully',
    };
  }
  /**
   * Gets source schema as a tree structure for UI display
   */
  async getSourceSchemaTree(
    endpointId: number,
  ): Promise<SchemaTreeResponseDto> {
    try {
      const endpoint = await this.endpointsService.getEndpointById(
        endpointId,
        'system',
      );
      if (!endpoint?.currentSchema) {
        throw new NotFoundException(
          `Endpoint ${endpointId} or its schema not found`,
        );
      }
      const treeNodes = this.buildSchemaTree(
        endpoint.currentSchema.fields,
        'source',
      );
      const statistics = this.calculateSchemaStatistics(
        endpoint.currentSchema.fields,
      );
      return {
        nodes: treeNodes,
        statistics,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get source schema tree: ${error.message}`,
      );
    }
  }
  /**
   * Gets destination schema as a tree structure for UI display
   */
  async getDestinationSchemaTree(): Promise<SchemaTreeResponseDto> {
    try {
      const internalSchema = this.getTazamaInternalSchema();
      const treeNodes = this.buildSchemaTree(internalSchema, 'destination');
      const statistics = this.calculateSchemaStatistics(internalSchema);
      return {
        nodes: treeNodes,
        statistics,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get destination schema tree: ${error.message}`,
      );
    }
  }
  /**
   * Compares two schemas and provides mapping suggestions
   */
  async compareSchemas(
    dto: SchemaComparisonDto,
  ): Promise<SchemaComparisonResultDto> {
    try {
      const sourceEndpoint = await this.endpointsService.getEndpointById(
        dto.sourceEndpointId,
        'system',
      );
      if (!sourceEndpoint?.currentSchema) {
        throw new NotFoundException(
          `Source endpoint ${dto.sourceEndpointId} or its schema not found`,
        );
      }
      let destinationFields: SchemaField[];
      if (dto.destinationEndpointId) {
        const destEndpoint = await this.endpointsService.getEndpointById(
          dto.destinationEndpointId,
          'system',
        );
        if (!destEndpoint?.currentSchema) {
          throw new NotFoundException(
            `Destination endpoint ${dto.destinationEndpointId} or its schema not found`,
          );
        }
        destinationFields = destEndpoint.currentSchema.fields;
      } else {
        destinationFields = this.getTazamaInternalSchema();
      }
      const suggestions = this.generateMappingSuggestions(
        sourceEndpoint.currentSchema.fields,
        destinationFields,
        dto.showCompatibleOnly || false,
      );
      const compatibility = this.calculateCompatibilityScore(
        suggestions,
        destinationFields,
      );
      return {
        suggestions,
        compatibility,
      };
    } catch (error) {
      throw new BadRequestException(
        `Schema comparison failed: ${error.message}`,
      );
    }
  }
  /**
   * Builds a tree structure from schema fields
   */
  private buildSchemaTree(
    fields: SchemaField[],
    prefix: string,
  ): SchemaTreeNodeDto[] {
    const nodes: SchemaTreeNodeDto[] = [];
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const nodeId = `${prefix}-${field.path.replace(/\./g, '-')}`;
      const node: SchemaTreeNodeDto = {
        id: nodeId,
        name: field.name,
        path: field.path,
        type: field.type,
        isRequired: field.isRequired,
        isLeaf: !field.children || field.children.length === 0,
        description: this.generateFieldDescription(field),
        metadata: {
          level: field.path.split('.').length - 1,
          isExpandable: !!(field.children && field.children.length > 0),
          fieldCount: field.children ? field.children.length : 0,
        },
      };
      if (field.children && field.children.length > 0) {
        node.children = this.buildSchemaTree(field.children, prefix);
        node.metadata!.parentId = nodeId;
      }
      nodes.push(node);
    }
    return nodes;
  }
  /**
   * Calculates statistics for schema fields
   */
  private calculateSchemaStatistics(fields: SchemaField[]): {
    totalFields: number;
    requiredFields: number;
    optionalFields: number;
    maxDepth: number;
    fieldTypes: { [type: string]: number };
  } {
    let totalFields = 0;
    let requiredFields = 0;
    let optionalFields = 0;
    let maxDepth = 0;
    const fieldTypes: { [type: string]: number } = {};
    const processFields = (fieldList: SchemaField[], depth: number = 1) => {
      maxDepth = Math.max(maxDepth, depth);
      for (const field of fieldList) {
        totalFields++;
        if (field.isRequired) {
          requiredFields++;
        } else {
          optionalFields++;
        }
        fieldTypes[field.type] = (fieldTypes[field.type] || 0) + 1;
        if (field.children && field.children.length > 0) {
          processFields(field.children, depth + 1);
        }
      }
    };
    processFields(fields);
    return {
      totalFields,
      requiredFields,
      optionalFields,
      maxDepth,
      fieldTypes,
    };
  }
  /**
   * Generates mapping suggestions between source and destination schemas
   */
  private generateMappingSuggestions(
    sourceFields: SchemaField[],
    destinationFields: SchemaField[],
    compatibleOnly: boolean,
  ): SchemaFieldMappingSuggestionDto[] {
    const suggestions: SchemaFieldMappingSuggestionDto[] = [];
    const sourceFieldsFlat = this.flattenSchemaFields(sourceFields);
    const destFieldsFlat = this.flattenSchemaFields(destinationFields);
    for (const sourceField of sourceFieldsFlat) {
      for (const destField of destFieldsFlat) {
        const suggestion = this.createMappingSuggestion(sourceField, destField);
        if (!compatibleOnly || suggestion.isTypeCompatible) {
          suggestions.push(suggestion);
        }
      }
    }
    return suggestions.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }
  /**
   * Creates a mapping suggestion between two fields
   */
  private createMappingSuggestion(
    sourceField: SchemaField,
    destField: SchemaField,
  ): SchemaFieldMappingSuggestionDto {
    const isTypeCompatible = this.areTypesCompatible(
      sourceField.type,
      destField.type,
    );
    const nameSimilarity = this.calculateNameSimilarity(
      sourceField.name,
      destField.name,
    );
    const pathSimilarity = this.calculateNameSimilarity(
      sourceField.path,
      destField.path,
    );
    let confidenceScore = 0;
    let suggestedTransformation = TransformationType.NONE;
    let reason = '';
    if (isTypeCompatible) {
      confidenceScore = nameSimilarity * 0.6 + pathSimilarity * 0.4;
      reason = 'Direct type compatibility';
    } else {
      confidenceScore = Math.max(nameSimilarity, pathSimilarity) * 0.3;
      if (
        destField.type === FieldType.STRING &&
        sourceField.type !== FieldType.STRING
      ) {
        suggestedTransformation = TransformationType.CONCAT;
        reason = 'Type conversion via concatenation';
      } else if (
        destField.type === FieldType.NUMBER &&
        sourceField.type === FieldType.STRING
      ) {
        suggestedTransformation = TransformationType.NONE;
        reason = 'String to number conversion needed';
        confidenceScore *= 0.5;
      }
    }
    return {
      sourceFieldPath: sourceField.path,
      destinationFieldPath: destField.path,
      sourceFieldType: sourceField.type,
      destinationFieldType: destField.type,
      confidenceScore: Math.max(0, Math.min(1, confidenceScore)),
      suggestedTransformation,
      reason,
      isTypeCompatible,
    };
  }
  /**
   * Calculates name similarity between two strings
   */
  private calculateNameSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    const words1 = s1.split(/[._-]/);
    const words2 = s2.split(/[._-]/);
    const commonWords = words1.filter((word) => words2.includes(word));
    if (commonWords.length > 0) {
      return commonWords.length / Math.max(words1.length, words2.length);
    }
    return 0;
  }
  /**
   * Flattens nested schema fields into a single array
   */
  private flattenSchemaFields(fields: SchemaField[]): SchemaField[] {
    const flattened: SchemaField[] = [];
    const processField = (field: SchemaField) => {
      flattened.push(field);
      if (field.children && field.children.length > 0) {
        field.children.forEach(processField);
      }
    };
    fields.forEach(processField);
    return flattened;
  }
  /**
   * Calculates compatibility score between schemas
   */
  private calculateCompatibilityScore(
    suggestions: SchemaFieldMappingSuggestionDto[],
    destinationFields: SchemaField[],
  ): {
    score: number;
    compatibleFields: number;
    totalFields: number;
    incompatibleFields: string[];
    missingRequiredFields: string[];
  } {
    const destFieldsFlat = this.flattenSchemaFields(destinationFields);
    const requiredDestFields = destFieldsFlat.filter((f) => f.isRequired);
    const compatibleSuggestions = suggestions.filter(
      (s) => s.isTypeCompatible && s.confidenceScore > 0.5,
    );
    const mappedDestPaths = new Set(
      compatibleSuggestions.map((s) => s.destinationFieldPath),
    );
    const compatibleFields = compatibleSuggestions.length;
    const totalFields = destFieldsFlat.length;
    const incompatibleFields = destFieldsFlat
      .filter((f) => !mappedDestPaths.has(f.path))
      .map((f) => f.path);
    const missingRequiredFields = requiredDestFields
      .filter((f) => !mappedDestPaths.has(f.path))
      .map((f) => f.path);
    const score = totalFields > 0 ? compatibleFields / totalFields : 0;
    return {
      score,
      compatibleFields,
      totalFields,
      incompatibleFields,
      missingRequiredFields,
    };
  }
  /**
   * Gets Tazama's internal data model schema
   */
  private getTazamaInternalSchema(): SchemaField[] {
    return [
      {
        name: 'transaction',
        path: 'transaction',
        type: FieldType.OBJECT,
        isRequired: true,
        children: [
          {
            name: 'id',
            path: 'transaction.id',
            type: FieldType.STRING,
            isRequired: true,
          },
          {
            name: 'amount',
            path: 'transaction.amount',
            type: FieldType.NUMBER,
            isRequired: true,
          },
          {
            name: 'currency',
            path: 'transaction.currency',
            type: FieldType.STRING,
            isRequired: true,
          },
          {
            name: 'timestamp',
            path: 'transaction.timestamp',
            type: FieldType.STRING,
            isRequired: true,
          },
        ],
      },
      {
        name: 'payer',
        path: 'payer',
        type: FieldType.OBJECT,
        isRequired: true,
        children: [
          {
            name: 'id',
            path: 'payer.id',
            type: FieldType.STRING,
            isRequired: true,
          },
          {
            name: 'name',
            path: 'payer.name',
            type: FieldType.STRING,
            isRequired: false,
          },
          {
            name: 'account',
            path: 'payer.account',
            type: FieldType.STRING,
            isRequired: true,
          },
        ],
      },
      {
        name: 'payee',
        path: 'payee',
        type: FieldType.OBJECT,
        isRequired: true,
        children: [
          {
            name: 'id',
            path: 'payee.id',
            type: FieldType.STRING,
            isRequired: true,
          },
          {
            name: 'name',
            path: 'payee.name',
            type: FieldType.STRING,
            isRequired: false,
          },
          {
            name: 'account',
            path: 'payee.account',
            type: FieldType.STRING,
            isRequired: true,
          },
        ],
      },
    ];
  }
  /**
   * Generates a description for a schema field
   */
  private generateFieldDescription(field: SchemaField): string {
    const baseDesc = `${field.type} field`;
    const requiredText = field.isRequired ? 'Required' : 'Optional';
    const childrenText = field.children
      ? ` with ${field.children.length} nested fields`
      : '';
    return `${requiredText} ${baseDesc}${childrenText}`;
  }
  /**
   * Validates field path format
   */
  private isValidFieldPath(path: string): boolean {
    const pathRegex = /^[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)*$/;
    return pathRegex.test(path);
  }
  /**
   * Validates field validation rules based on type
   */
  private validateFieldValidationRules(
    fieldType: string,
    rules: any,
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    switch (fieldType.toLowerCase()) {
      case 'string':
        if (
          rules.minLength !== undefined &&
          (typeof rules.minLength !== 'number' || rules.minLength < 0)
        ) {
          errors.push({
            field: 'validationRules.minLength',
            message: 'minLength must be a non-negative number',
            code: 'INVALID_VALIDATION_RULE',
          });
        }
        if (
          rules.maxLength !== undefined &&
          (typeof rules.maxLength !== 'number' || rules.maxLength < 0)
        ) {
          errors.push({
            field: 'validationRules.maxLength',
            message: 'maxLength must be a non-negative number',
            code: 'INVALID_VALIDATION_RULE',
          });
        }
        break;
      case 'number':
      case 'integer':
        if (rules.min !== undefined && typeof rules.min !== 'number') {
          errors.push({
            field: 'validationRules.min',
            message: 'min must be a number',
            code: 'INVALID_VALIDATION_RULE',
          });
        }
        if (rules.max !== undefined && typeof rules.max !== 'number') {
          errors.push({
            field: 'validationRules.max',
            message: 'max must be a number',
            code: 'INVALID_VALIDATION_RULE',
          });
        }
        break;
    }
    return errors;
  }
}
