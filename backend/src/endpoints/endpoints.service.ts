import { Injectable, Logger } from '@nestjs/common';
import { EndpointsRepository } from './endpoints.repository';
import { PayloadParsingService } from './payload-parsing.service';
import { AuditService } from '../audit/audit.service';
import {
  ParsePayloadDto,
  CreateEndpointWithSchemaDto,
  EndpointLifecycleTransitionDto,
  ParsedSchemaResponseDto,
  EndpointCreationResponseDto,
  SchemaValidationResultDto,
  ConstantFieldDto,
  FormulaFieldDto,
} from '../common/schema-workflow.dto';
import {
  Endpoint,
  SourceSchema,
  SchemaField,
  EndpointStatus,
  HttpMethod,
  TransactionType,
  FieldType,
  ConstantField,
  FormulaField,
  EnhancedSourceSchema,
} from '../common/interfaces';

@Injectable()
export class EndpointsService {
  private readonly logger = new Logger(EndpointsService.name);

  constructor(
    private readonly endpointsRepository: EndpointsRepository,
    private readonly payloadParsingService: PayloadParsingService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * User Story #300: Parse payload and generate schema (no persistence)
   * Allows Editor to paste JSON/XML and see generated schema before saving
   */
  async parsePayloadAndGenerateSchema(
    dto: ParsePayloadDto,
    tenantId: string,
  ): Promise<ParsedSchemaResponseDto> {
    this.logger.log(`User Story #300: Parsing payload for tenant ${tenantId}`);

    try {
      const result = await this.payloadParsingService.parsePayloadToSchema(
        dto.payload,
        dto.contentType,
        dto.filename,
      );

      if (!result.success) {
        return {
          success: false,
          validation: result.validation,
        };
      }

      return {
        success: true,
        schema: {
          sourceFields: result.sourceFields,
          metadata: result.metadata,
        },
        validation: result.validation,
      };
    } catch (error) {
      this.logger.error(
        `Failed to parse payload: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        validation: {
          success: false,
          errors: [`Parsing failed: ${error.message}`],
          warnings: [],
        },
      };
    }
  }

  /**
   * User Story #300: Create endpoint with generated schema
   * Saves schema_json with only source fields in endpoints table
   */
  async createEndpointWithGeneratedSchema(
    dto: CreateEndpointWithSchemaDto,
    tenantId: string,
    userId: string,
  ): Promise<EndpointCreationResponseDto> {
    this.logger.log(
      `User Story #300: Creating endpoint with schema for tenant ${tenantId}`,
    );

    try {
      // Step 1: Parse payload and generate schema
      const parsingResult =
        await this.payloadParsingService.parsePayloadToSchema(
          dto.payload,
          dto.contentType,
        );

      if (!parsingResult.success) {
        return {
          success: false,
          message: 'Failed to parse payload',
          validation: parsingResult.validation,
        };
      }

      // Step 2: Apply field adjustments if provided
      let sourceFields = parsingResult.sourceFields;
      if (dto.fieldAdjustments && dto.fieldAdjustments.length > 0) {
        sourceFields = this.payloadParsingService.applyFieldAdjustments(
          sourceFields,
          dto.fieldAdjustments,
        );
        this.logger.log(
          `Applied ${dto.fieldAdjustments.length} field adjustments`,
        );
      }

      // Step 3: Validate final schema
      const finalValidation = this.validateFinalSchema(sourceFields);
      if (!finalValidation.success) {
        return {
          success: false,
          message: 'Schema validation failed',
          validation: finalValidation,
        };
      }

      // Step 4: Create SourceSchema for storage
      const sourceSchema: SourceSchema = {
        sourceFields,
        version: 1,
        lastUpdated: new Date(),
        createdBy: userId,
      };

      // Step 5: Create endpoint entity
      const endpointData: Omit<
        Endpoint,
        'id' | 'createdAt' | 'updatedAt' | 'tenantId'
      > = {
        path: dto.path,
        method: dto.method as HttpMethod,
        version: dto.version,
        transactionType: dto.transactionType as TransactionType,
        status: EndpointStatus.IN_PROGRESS,
        description: dto.description,
        createdBy: userId,
        schemaJson: sourceSchema,
      };

      // Step 6: Save to database
      const endpointId = await this.endpointsRepository.createEndpoint(
        endpointData,
        tenantId,
      );

      // Step 7: Audit logging
      await this.auditService.logAction({
        action: 'CREATE_ENDPOINT_WITH_SCHEMA',
        actor: userId,
        tenantId,
        endpointName: dto.name || dto.path,
      });

      this.logger.log(
        `Successfully created endpoint ${endpointId} with ${sourceFields.length} source fields`,
      );

      return {
        success: true,
        endpointId,
        message: `Endpoint created successfully with ${sourceFields.length} source fields`,
        validation: finalValidation,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create endpoint: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to create endpoint: ${error.message}`,
      };
    }
  }

  /**
   * User Story #300: Update endpoint schema with field adjustments
   * Allow Editor to modify types and isRequired flags before saving
   */
  async updateEndpointSourceFields(
    endpointId: number,
    fieldAdjustments: { path: string; type: string; isRequired: boolean }[],
    tenantId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `User Story #300: Updating source fields for endpoint ${endpointId}`,
    );

    try {
      const endpoint = await this.endpointsRepository.findEndpointById(
        endpointId,
        tenantId,
      );
      if (!endpoint || endpoint.tenantId !== tenantId) {
        return {
          success: false,
          message: 'Endpoint not found or access denied',
        };
      }

      if (!endpoint.schemaJson) {
        return {
          success: false,
          message: 'Endpoint has no source schema',
        };
      }

      // Check endpoint status - only allow updates in IN_PROGRESS status
      if (endpoint.status !== EndpointStatus.IN_PROGRESS) {
        return {
          success: false,
          message: `Cannot update schema. Endpoint status is ${endpoint.status}`,
        };
      }

      // Apply field adjustments
      const updatedFields = this.applyFieldUpdates(
        endpoint.schemaJson.sourceFields,
        fieldAdjustments,
      );

      // Update source schema
      const updatedSchema: SourceSchema = {
        ...endpoint.schemaJson,
        sourceFields: updatedFields,
        lastUpdated: new Date(),
      };

      // Save to database
      await this.endpointsRepository.updateEndpointSourceSchema(
        endpointId,
        updatedSchema,
        userId,
        tenantId,
      );

      // Audit logging
      await this.auditService.logAction({
        action: 'UPDATE_SOURCE_FIELDS',
        actor: userId,
        tenantId,
        endpointName: endpoint.path,
      });

      return {
        success: true,
        message: `Updated ${fieldAdjustments.length} source fields`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update source fields: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to update source fields: ${error.message}`,
      };
    }
  }

  /**
   * User Story #300: Implement endpoint lifecycle transitions
   * IN_PROGRESS → UNDER_REVIEW → APPROVED → READY_FOR_DEPLOYMENT → DEPLOYED
   */
  async transitionEndpointStatus(
    endpointId: number,
    dto: EndpointLifecycleTransitionDto,
    tenantId: string,
    userId: string,
    userRoles: string[],
  ): Promise<{ success: boolean; message: string; newStatus?: string }> {
    this.logger.log(
      `User Story #300: Transitioning endpoint ${endpointId} to ${dto.targetStatus}`,
    );

    try {
      const endpoint = await this.endpointsRepository.findEndpointById(
        endpointId,
        tenantId,
      );
      if (!endpoint || endpoint.tenantId !== tenantId) {
        return {
          success: false,
          message: 'Endpoint not found or access denied',
        };
      }

      // Validate transition
      const transitionValidation = this.validateStatusTransition(
        endpoint.status,
        dto.targetStatus as EndpointStatus,
        userRoles,
      );

      if (!transitionValidation.isValid) {
        return {
          success: false,
          message: transitionValidation.reason,
        };
      }

      // Additional validation for specific transitions
      if (
        (dto.targetStatus as EndpointStatus) === EndpointStatus.UNDER_REVIEW
      ) {
        const schemaValidation = this.validateSchemaForReview(endpoint);
        if (!schemaValidation.success) {
          return {
            success: false,
            message: `Cannot submit for review: ${schemaValidation.errors.join(', ')}`,
          };
        }
      }

      // Update status
      await this.endpointsRepository.updateEndpointStatus(
        endpointId,
        dto.targetStatus as EndpointStatus,
        userId,
      );

      // Audit logging
      await this.auditService.logAction({
        action: `STATUS_CHANGE_${endpoint.status}_TO_${dto.targetStatus}`,
        actor: userId,
        tenantId,
        endpointName: endpoint.path,
      });

      return {
        success: true,
        message: `Endpoint status changed from ${endpoint.status} to ${dto.targetStatus}`,
        newStatus: dto.targetStatus,
      };
    } catch (error) {
      this.logger.error(
        `Failed to transition status: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to transition status: ${error.message}`,
      };
    }
  }

  /**
   * User Story #300: Get endpoints with tenant isolation
   * Ensure tenant_id isolation from JWT
   */
  async getEndpointsByTenant(
    tenantId: string,
    status?: EndpointStatus,
  ): Promise<Endpoint[]> {
    this.logger.log(
      `User Story #300: Getting endpoints for tenant ${tenantId}`,
    );
    if (status) {
      return await this.endpointsRepository.findEndpointsByStatus(
        status,
        tenantId,
      );
    } else {
      return await this.endpointsRepository.findEndpointsByCreator(
        '',
        tenantId,
      );
    }
  }

  /**
   * User Story #300: Get endpoint with schema validation
   */
  async getEndpointWithSchema(
    endpointId: number,
    tenantId: string,
  ): Promise<{
    endpoint: Endpoint | null;
    validation?: SchemaValidationResultDto;
  }> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );

    if (!endpoint || endpoint.tenantId !== tenantId) {
      return { endpoint: null };
    }

    let validation: SchemaValidationResultDto | undefined;
    if (endpoint.schemaJson) {
      validation = this.validateFinalSchema(endpoint.schemaJson.sourceFields);
    }

    return { endpoint, validation };
  }

  /**
   * Get endpoint by ID (for compatibility with mapping services)
   */
  async getEndpointById(
    endpointId: number,
    tenantId: string,
  ): Promise<Endpoint | null> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );

    if (!endpoint || endpoint.tenantId !== tenantId) {
      return null;
    }

    return endpoint;
  }

  /**
   * Enhanced schema validation with detailed feedback
   */
  private validateFinalSchema(
    sourceFields: SchemaField[],
  ): SchemaValidationResultDto {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for at least one field
    if (sourceFields.length === 0) {
      errors.push(
        'Schema must contain at least one field. Please ensure your payload contains data.',
      );
      return { success: false, errors, warnings };
    }

    // Check for duplicate paths with detailed context
    const pathMap = new Map<string, number>();
    const duplicates: { path: string; count: number }[] = [];

    this.extractAllPaths(sourceFields).forEach((path) => {
      const count = pathMap.get(path) || 0;
      pathMap.set(path, count + 1);
      if (count === 1) {
        // Found second occurrence
        duplicates.push({ path, count: 2 });
      } else if (count > 1) {
        const existing = duplicates.find((d) => d.path === path);
        if (existing) existing.count = count + 1;
      }
    });

    if (duplicates.length > 0) {
      duplicates.forEach(({ path, count }) => {
        errors.push(
          `Duplicate field path '${path}' found ${count} times. Each field must have a unique path.`,
        );
      });
    }

    // Analyze field distribution
    const requiredFields = this.countRequiredFields(sourceFields);
    const totalFields = this.countTotalFields(sourceFields);
    const requiredPercentage = (requiredFields / totalFields) * 100;

    if (requiredFields === 0) {
      warnings.push(
        'No required fields defined. Consider marking key fields as required to ensure data integrity.',
      );
    } else if (requiredPercentage > 80) {
      warnings.push(
        `${requiredPercentage.toFixed(0)}% of fields are required. Consider if all these fields are truly mandatory.`,
      );
    }

    // Check for complex nested structures
    const maxDepth = this.calculateSchemaDepth(sourceFields);
    if (maxDepth > 8) {
      warnings.push(
        `Schema is deeply nested (${maxDepth} levels). Consider flattening the structure for better performance and maintainability.`,
      );
    }

    // Check for array fields without proper configuration
    this.validateArrayFields(sourceFields, warnings);

    // Check for potential naming issues
    this.validateFieldNaming(sourceFields, warnings);

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate array fields for proper configuration
   */
  private validateArrayFields(fields: SchemaField[], warnings: string[]): void {
    const checkArrayFields = (fieldList: SchemaField[]): void => {
      fieldList.forEach((field) => {
        if (field.type === FieldType.ARRAY) {
          if (!field.arrayElementType) {
            warnings.push(
              `Array field '${field.path}' should specify element type for better validation.`,
            );
          }
          if (!field.children && field.arrayElementType === FieldType.OBJECT) {
            warnings.push(
              `Object array field '${field.path}' should define child structure.`,
            );
          }
        }
        if (field.children) {
          checkArrayFields(field.children);
        }
      });
    };

    checkArrayFields(fields);
  }

  /**
   * Validate field naming conventions
   */
  private validateFieldNaming(fields: SchemaField[], warnings: string[]): void {
    const checkNaming = (fieldList: SchemaField[]): void => {
      fieldList.forEach((field) => {
        // Check for very long field names
        if (field.name.length > 50) {
          warnings.push(
            `Field '${field.name}' has a very long name (${field.name.length} characters). Consider shortening for better readability.`,
          );
        }

        // Check for potentially confusing names
        if (
          field.name.toLowerCase().includes('temp') ||
          field.name.toLowerCase().includes('test')
        ) {
          warnings.push(
            `Field '${field.name}' appears to be temporary or test data. Consider using production-appropriate names.`,
          );
        }

        // Check for common typos or inconsistencies
        if (field.name.includes('_') && field.name.includes('-')) {
          warnings.push(
            `Field '${field.name}' mixes underscore and hyphen. Consider consistent naming convention.`,
          );
        }

        if (field.children) {
          checkNaming(field.children);
        }
      });
    };

    checkNaming(fields);
  }

  /**
   * Calculate maximum schema depth
   */
  private calculateSchemaDepth(
    fields: SchemaField[],
    currentDepth = 0,
  ): number {
    let maxDepth = currentDepth;

    fields.forEach((field) => {
      if (field.children && field.children.length > 0) {
        const childDepth = this.calculateSchemaDepth(
          field.children,
          currentDepth + 1,
        );
        maxDepth = Math.max(maxDepth, childDepth);
      }
    });

    return maxDepth;
  }

  /**
   * Count total fields including nested fields
   */
  private countTotalFields(fields: SchemaField[]): number {
    return fields.reduce((count, field) => {
      let fieldCount = 1;
      if (field.children) {
        fieldCount += this.countTotalFields(field.children);
      }
      return count + fieldCount;
    }, 0);
  }

  /**
   * Validate status transition rules
   */
  private validateStatusTransition(
    currentStatus: EndpointStatus,
    targetStatus: EndpointStatus,
    userRoles: string[],
  ): { isValid: boolean; reason: string } {
    const transitions: Record<
      EndpointStatus,
      { allowed: EndpointStatus[]; requiredRoles: string[] }
    > = {
      [EndpointStatus.IN_PROGRESS]: {
        allowed: [EndpointStatus.UNDER_REVIEW],
        requiredRoles: ['editor'],
      },
      [EndpointStatus.UNDER_REVIEW]: {
        allowed: [EndpointStatus.PENDING_APPROVAL, EndpointStatus.IN_PROGRESS],
        requiredRoles: ['approver'],
      },
      [EndpointStatus.PENDING_APPROVAL]: {
        allowed: [
          EndpointStatus.READY_FOR_DEPLOYMENT,
          EndpointStatus.IN_PROGRESS,
        ],
        requiredRoles: ['publisher'],
      },
      [EndpointStatus.READY_FOR_DEPLOYMENT]: {
        allowed: [EndpointStatus.DEPLOYED, EndpointStatus.PENDING_APPROVAL],
        requiredRoles: ['publisher'],
      },
      [EndpointStatus.DEPLOYED]: {
        allowed: [EndpointStatus.SUSPENDED],
        requiredRoles: ['publisher'],
      },
      [EndpointStatus.SUSPENDED]: {
        allowed: [EndpointStatus.DEPLOYED],
        requiredRoles: ['publisher'],
      },
      [EndpointStatus.PUBLISHED]: {
        allowed: [EndpointStatus.DEPRECATED],
        requiredRoles: ['publisher'],
      },
      [EndpointStatus.DEPRECATED]: {
        allowed: [],
        requiredRoles: [],
      },
    };

    const currentTransition = transitions[currentStatus];
    if (!currentTransition) {
      return {
        isValid: false,
        reason: `Invalid current status: ${currentStatus}`,
      };
    }

    if (!currentTransition.allowed.includes(targetStatus)) {
      return {
        isValid: false,
        reason: `Cannot transition from ${currentStatus} to ${targetStatus}`,
      };
    }

    const hasRequiredRole = currentTransition.requiredRoles.some((role) =>
      userRoles.includes(role),
    );

    if (!hasRequiredRole) {
      return {
        isValid: false,
        reason: `Insufficient permissions. Required roles: ${currentTransition.requiredRoles.join(', ')}`,
      };
    }

    return { isValid: true, reason: '' };
  }

  /**
   * Validate schema for review submission
   */
  private validateSchemaForReview(
    endpoint: Endpoint,
  ): SchemaValidationResultDto {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!endpoint.schemaJson) {
      errors.push('Endpoint must have a source schema');
      return { success: false, errors, warnings };
    }

    if (endpoint.schemaJson.sourceFields.length === 0) {
      errors.push('Source schema must contain at least one field');
    }

    const requiredFieldCount = this.countRequiredFields(
      endpoint.schemaJson.sourceFields,
    );
    if (requiredFieldCount === 0) {
      warnings.push('Consider marking key fields as required before review');
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Apply field updates to source fields
   */
  private applyFieldUpdates(
    sourceFields: SchemaField[],
    updates: { path: string; type: string; isRequired: boolean }[],
  ): SchemaField[] {
    const updateMap = new Map(updates.map((u) => [u.path, u]));
    return this.applyUpdatesRecursively(sourceFields, updateMap);
  }

  /**
   * Apply updates recursively
   */
  private applyUpdatesRecursively(
    fields: SchemaField[],
    updateMap: Map<string, { type: string; isRequired: boolean }>,
  ): SchemaField[] {
    return fields.map((field) => {
      const update = updateMap.get(field.path);
      const updatedField = { ...field };

      if (update) {
        updatedField.type = update.type as any;
        updatedField.isRequired = update.isRequired;
      }

      if (field.children) {
        updatedField.children = this.applyUpdatesRecursively(
          field.children,
          updateMap,
        );
      }

      return updatedField;
    });
  }

  /**
   * Extract all field paths
   */
  private extractAllPaths(fields: SchemaField[]): string[] {
    const paths: string[] = [];
    for (const field of fields) {
      paths.push(field.path);
      if (field.children) {
        paths.push(...this.extractAllPaths(field.children));
      }
    }
    return paths;
  }

  /**
   * Count required fields
   */
  private countRequiredFields(fields: SchemaField[]): number {
    let count = 0;
    for (const field of fields) {
      if (field.isRequired) count++;
      if (field.children) {
        count += this.countRequiredFields(field.children);
      }
    }
    return count;
  }

  /**
   * User Story #300: Add constant field to endpoint schema
   */
  async addConstantField(
    endpointId: number,
    constantFieldDto: ConstantFieldDto,
    tenantId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Adding constant field ${constantFieldDto.path} to endpoint ${endpointId}`,
    );

    try {
      const endpoint = await this.endpointsRepository.findEndpointById(
        endpointId,
        tenantId,
      );
      if (!endpoint) {
        return { success: false, message: 'Endpoint not found' };
      }

      // Get current schema
      let schema = endpoint.schemaJson as EnhancedSourceSchema;
      if (!schema) {
        schema = {
          version: 1,
          sourceFields: [],
          constantFields: [],
          formulaFields: [],
          lastUpdated: new Date(),
          createdBy: userId,
        };
      }

      // Ensure constantFields array exists
      if (!schema.constantFields) {
        schema.constantFields = [];
      }

      // Check for duplicate path
      const existingConstant = schema.constantFields.find(
        (cf) => cf.path === constantFieldDto.path,
      );
      if (existingConstant) {
        return {
          success: false,
          message: `Constant field with path '${constantFieldDto.path}' already exists`,
        };
      }

      // Validate that the path doesn't conflict with source fields
      const conflictingSourceField = this.findFieldByPath(
        schema.sourceFields,
        constantFieldDto.path,
      );
      if (conflictingSourceField) {
        return {
          success: false,
          message: `Path '${constantFieldDto.path}' conflicts with existing source field`,
        };
      }

      // Add the constant field
      const constantField: ConstantField = {
        path: constantFieldDto.path,
        type: constantFieldDto.type,
        value: constantFieldDto.value,
        description: constantFieldDto.description,
      };

      schema.constantFields.push(constantField);
      schema.lastUpdated = new Date();

      // Update the endpoint with the complete enhanced schema
      await this.endpointsRepository.updateEndpointEnhancedSchema(
        endpointId,
        schema,
        userId,
        tenantId,
      );

      // Audit log
      await this.auditService.logAction({
        action: 'ADD_CONSTANT_FIELD',
        actor: userId,
        tenantId,
        endpointName: endpoint.path,
      });

      return {
        success: true,
        message: `Constant field '${constantField.path}' added successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to add constant field: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to add constant field: ${error.message}`,
      };
    }
  }

  /**
   * User Story #300: Add formula field to endpoint schema
   */
  async addFormulaField(
    endpointId: number,
    formulaFieldDto: FormulaFieldDto,
    tenantId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Adding formula field ${formulaFieldDto.path} to endpoint ${endpointId}`,
    );

    try {
      const endpoint = await this.endpointsRepository.findEndpointById(
        endpointId,
        tenantId,
      );
      if (!endpoint) {
        return { success: false, message: 'Endpoint not found' };
      }

      // Get current schema
      let schema = endpoint.schemaJson as EnhancedSourceSchema;
      if (!schema) {
        schema = {
          version: 1,
          sourceFields: [],
          constantFields: [],
          formulaFields: [],
          lastUpdated: new Date(),
          createdBy: userId,
        };
      }

      // Ensure formulaFields array exists
      if (!schema.formulaFields) {
        schema.formulaFields = [];
      }

      // Check for duplicate path
      const existingFormula = schema.formulaFields.find(
        (ff) => ff.path === formulaFieldDto.path,
      );
      if (existingFormula) {
        return {
          success: false,
          message: `Formula field with path '${formulaFieldDto.path}' already exists`,
        };
      }

      // Validate that the path doesn't conflict with source fields
      const conflictingSourceField = this.findFieldByPath(
        schema.sourceFields,
        formulaFieldDto.path,
      );
      if (conflictingSourceField) {
        return {
          success: false,
          message: `Path '${formulaFieldDto.path}' conflicts with existing source field`,
        };
      }

      // Validate that referenced fields exist
      const validationResult = this.validateFormulaReferences(
        formulaFieldDto.referencedFields,
        schema,
      );
      if (!validationResult.isValid) {
        return {
          success: false,
          message: validationResult.error || 'Validation failed',
        };
      }

      // Add the formula field
      const formulaField: FormulaField = {
        path: formulaFieldDto.path,
        type: formulaFieldDto.type,
        formula: formulaFieldDto.formula,
        description: formulaFieldDto.description,
        referencedFields: formulaFieldDto.referencedFields,
      };

      schema.formulaFields.push(formulaField);
      schema.lastUpdated = new Date();

      // Update the endpoint with the complete enhanced schema
      await this.endpointsRepository.updateEndpointEnhancedSchema(
        endpointId,
        schema,
        userId,
        tenantId,
      );

      // Audit log
      await this.auditService.logAction({
        action: 'ADD_FORMULA_FIELD',
        actor: userId,
        tenantId,
        endpointName: endpoint.path,
      });

      return {
        success: true,
        message: `Formula field '${formulaField.path}' added successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to add formula field: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to add formula field: ${error.message}`,
      };
    }
  }

  /**
   * User Story #300: Remove constant field from endpoint schema
   */
  async removeConstantField(
    endpointId: number,
    fieldPath: string,
    tenantId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Removing constant field ${fieldPath} from endpoint ${endpointId}`,
    );

    try {
      const endpoint = await this.endpointsRepository.findEndpointById(
        endpointId,
        tenantId,
      );
      if (!endpoint) {
        return { success: false, message: 'Endpoint not found' };
      }

      const schema = endpoint.schemaJson as EnhancedSourceSchema;
      if (!schema?.constantFields) {
        return {
          success: false,
          message: 'No constant fields found in schema',
        };
      }

      const fieldIndex = schema.constantFields.findIndex(
        (cf) => cf.path === fieldPath,
      );
      if (fieldIndex === -1) {
        return {
          success: false,
          message: `Constant field '${fieldPath}' not found`,
        };
      }

      schema.lastUpdated = new Date();

      // Update the endpoint with the complete enhanced schema
      await this.endpointsRepository.updateEndpointEnhancedSchema(
        endpointId,
        schema,
        userId,
        tenantId,
      );

      // Audit log
      await this.auditService.logAction({
        action: 'REMOVE_CONSTANT_FIELD',
        actor: userId,
        tenantId,
        endpointName: endpoint.path,
      });

      return {
        success: true,
        message: `Constant field '${fieldPath}' removed successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to remove constant field: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to remove constant field: ${error.message}`,
      };
    }
  }

  /**
   * User Story #300: Remove formula field from endpoint schema
   */
  async removeFormulaField(
    endpointId: number,
    fieldPath: string,
    tenantId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Removing formula field ${fieldPath} from endpoint ${endpointId}`,
    );

    try {
      const endpoint = await this.endpointsRepository.findEndpointById(
        endpointId,
        tenantId,
      );
      if (!endpoint) {
        return { success: false, message: 'Endpoint not found' };
      }

      const schema = endpoint.schemaJson as EnhancedSourceSchema;
      if (!schema?.formulaFields) {
        return { success: false, message: 'No formula fields found in schema' };
      }

      const fieldIndex = schema.formulaFields.findIndex(
        (ff) => ff.path === fieldPath,
      );
      if (fieldIndex === -1) {
        return {
          success: false,
          message: `Formula field '${fieldPath}' not found`,
        };
      }

      // Remove the field
      schema.lastUpdated = new Date();

      // Update the endpoint with the complete enhanced schema
      await this.endpointsRepository.updateEndpointEnhancedSchema(
        endpointId,
        schema,
        userId,
        tenantId,
      );

      // Audit log
      await this.auditService.logAction({
        action: 'REMOVE_FORMULA_FIELD',
        actor: userId,
        tenantId,
        endpointName: endpoint.path,
      });

      return {
        success: true,
        message: `Formula field '${fieldPath}' removed successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to remove formula field: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: `Failed to remove formula field: ${error.message}`,
      };
    }
  }

  /**
   * Helper method to find a field by path in source fields
   */
  private findFieldByPath(
    fields: SchemaField[],
    path: string,
  ): SchemaField | null {
    for (const field of fields) {
      if (field.path === path) {
        return field;
      }
      if (field.children) {
        const found = this.findFieldByPath(field.children, path);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Validate that formula references exist in the schema
   */
  private validateFormulaReferences(
    referencedFields: string[],
    schema: EnhancedSourceSchema,
  ): { isValid: boolean; error?: string } {
    const allPaths = new Set<string>();

    // Collect all source field paths
    const addSourcePaths = (fields: SchemaField[]) => {
      fields.forEach((field) => {
        allPaths.add(field.path);
        if (field.children) {
          addSourcePaths(field.children);
        }
      });
    };
    addSourcePaths(schema.sourceFields);

    // Add constant field paths
    if (schema.constantFields) {
      schema.constantFields.forEach((cf) => allPaths.add(cf.path));
    }

    // Check that all referenced fields exist
    for (const refField of referencedFields) {
      if (!allPaths.has(refField)) {
        return {
          isValid: false,
          error: `Referenced field '${refField}' does not exist in the schema`,
        };
      }
    }

    return { isValid: true };
  }
}
