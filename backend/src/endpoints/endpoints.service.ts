import { Injectable } from '@nestjs/common';
import { EndpointsRepository } from './endpoints.repository';
import { SchemaInferenceService } from '../schemas/schema-inference.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateEndpointDto,
  InferSchemaDto,
  UpdateFieldDto,
  AddFieldDto,
} from '../common/dto';
import { Endpoint, SchemaField, EndpointStatus } from '../common/interfaces';

@Injectable()
export class EndpointsService {
  constructor(
    private readonly endpointsRepository: EndpointsRepository,
    private readonly schemaInferenceService: SchemaInferenceService,
    private readonly auditService: AuditService,
  ) {}

  async inferSchemaFromPayload(
    dto: InferSchemaDto,
    editorIdentity: string,
  ): Promise<SchemaField[]> {
    const schema = await this.schemaInferenceService.inferSchemaFromPayload(
      dto.payload,
      dto.contentType,
    );
    await this.auditService.logSchemaInferred(editorIdentity, 'temp', {
      contentType: dto.contentType,
      fieldsInferred: schema.length,
    });
    return schema;
  }

  async createEndpoint(
    dto: CreateEndpointDto,
    createdBy: string,
  ): Promise<{ endpointId: number; schema: SchemaField[] }> {
    const schema = await this.schemaInferenceService.inferSchemaFromPayload(
      dto.samplePayload,
      dto.contentType,
    );

    const validation = this.schemaInferenceService.validateSchema(schema);
    if (!validation.isValid) {
      throw new Error(
        `Schema validation failed: ${validation.errors.join(', ')}`,
      );
    }

    const endpointId = await this.endpointsRepository.createEndpoint({
      path: dto.path,
      method: dto.method,
      version: dto.version,
      transactionType: dto.transactionType,
      status: EndpointStatus.IN_PROGRESS,
      description: dto.description,
      createdBy,
    });

    await this.endpointsRepository.createSchemaVersion(
      endpointId,
      schema,
      createdBy,
    );

    await this.auditService.logEndpointCreated(createdBy, dto.path, {
      method: dto.method,
      version: dto.version,
      transactionType: dto.transactionType,
      fieldsCount: schema.length,
    });

    return { endpointId, schema };
  }

  async validateSchema(
    fields: SchemaField[],
    editorIdentity: string,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const validation = this.schemaInferenceService.validateSchema(fields);

    await this.auditService.logSchemaValidated(
      editorIdentity,
      'manual-validation',
      {
        isValid: validation.isValid,
        errorsCount: validation.errors.length,
      },
    );

    return validation;
  }

  async saveEndpointDraft(
    endpointId: number,
    schema: SchemaField[],
    notes: string,
    editorIdentity: string,
  ): Promise<void> {
    const validation = this.schemaInferenceService.validateSchema(schema);
    if (!validation.isValid) {
      throw new Error(
        `Cannot save draft with invalid schema: ${validation.errors.join(', ')}`,
      );
    }

    const schemaVersionId = await this.endpointsRepository.createSchemaVersion(
      endpointId,
      schema,
      editorIdentity,
    );

    await this.auditService.logDraftSaved(
      editorIdentity,
      `endpoint-${endpointId}`,
      {
        schemaVersionId,
        notes,
        fieldsCount: schema.length,
      },
    );
  }

  async getEndpointById(id: number): Promise<Endpoint | null> {
    const endpoint = await this.endpointsRepository.findEndpointById(id);

    if (endpoint) {
      const latestSchema =
        await this.endpointsRepository.getLatestSchemaVersion(id);
      if (latestSchema) {
        endpoint.currentSchema = latestSchema;
      }
    }

    return endpoint;
  }

  async getEndpointsByCreator(createdBy: string): Promise<Endpoint[]> {
    return await this.endpointsRepository.findEndpointsByCreator(createdBy);
  }

  async updateEndpointStatus(
    endpointId: number,
    status: EndpointStatus,
    editorIdentity: string,
  ): Promise<void> {
    await this.endpointsRepository.updateEndpointStatus(endpointId, status);

    await this.auditService.logAction({
      action: 'STATUS_UPDATED',
      editorIdentity,
      endpointName: `endpoint-${endpointId}`,
      details: { newStatus: status },
    });
  }

  async submitEndpointForApproval(
    endpointId: number,
    editorIdentity: string,
  ): Promise<void> {
    const endpoint =
      await this.endpointsRepository.findEndpointById(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    if (endpoint.status !== EndpointStatus.IN_PROGRESS) {
      throw new Error(
        'Only in-progress endpoints can be submitted for approval',
      );
    }

    await this.endpointsRepository.updateEndpointStatus(
      endpointId,
      EndpointStatus.PENDING_APPROVAL,
    );

    await this.auditService.logAction({
      action: 'SUBMITTED_FOR_APPROVAL',
      editorIdentity,
      endpointName: `endpoint-${endpointId}`,
      details: { previousStatus: EndpointStatus.IN_PROGRESS },
    });
  }

  async approveEndpoint(
    endpointId: number,
    approverIdentity: string,
    comments?: string,
  ): Promise<void> {
    const endpoint =
      await this.endpointsRepository.findEndpointById(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    if (endpoint.status !== EndpointStatus.PENDING_APPROVAL) {
      throw new Error('Only pending approval endpoints can be approved');
    }

    await this.endpointsRepository.updateEndpointStatus(
      endpointId,
      EndpointStatus.APPROVED,
    );

    await this.auditService.logAction({
      action: 'ENDPOINT_APPROVED',
      editorIdentity: approverIdentity,
      endpointName: `endpoint-${endpointId}`,
      details: {
        comments: comments || 'No comments provided',
        approvedBy: approverIdentity,
      },
    });
  }

  async rejectEndpoint(
    endpointId: number,
    approverIdentity: string,
    reason: string,
  ): Promise<void> {
    const endpoint =
      await this.endpointsRepository.findEndpointById(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    if (endpoint.status !== EndpointStatus.PENDING_APPROVAL) {
      throw new Error('Only pending approval endpoints can be rejected');
    }

    await this.endpointsRepository.updateEndpointStatus(
      endpointId,
      EndpointStatus.IN_PROGRESS,
    );

    await this.auditService.logAction({
      action: 'ENDPOINT_REJECTED',
      editorIdentity: approverIdentity,
      endpointName: `endpoint-${endpointId}`,
      details: {
        reason,
        rejectedBy: approverIdentity,
      },
    });
  }

  async publishEndpoint(
    endpointId: number,
    publisherIdentity: string,
  ): Promise<void> {
    const endpoint =
      await this.endpointsRepository.findEndpointById(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    if (endpoint.status !== EndpointStatus.APPROVED) {
      throw new Error('Only approved endpoints can be published');
    }

    await this.endpointsRepository.updateEndpointStatus(
      endpointId,
      EndpointStatus.PUBLISHED,
    );

    await this.auditService.logAction({
      action: 'ENDPOINT_PUBLISHED',
      editorIdentity: publisherIdentity,
      endpointName: `endpoint-${endpointId}`,
      details: {
        publishedBy: publisherIdentity,
        publishedAt: new Date().toISOString(),
      },
    });
  }

  async getPendingApprovalEndpoints(): Promise<Endpoint[]> {
    return await this.endpointsRepository.findEndpointsByStatus(
      EndpointStatus.PENDING_APPROVAL,
    );
  }

  async getApprovedEndpoints(): Promise<Endpoint[]> {
    return await this.endpointsRepository.findEndpointsByStatus(
      EndpointStatus.APPROVED,
    );
  }

  async getSchemaFields(endpointId: number): Promise<SchemaField[]> {
    const endpoint =
      await this.endpointsRepository.findEndpointById(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema =
      await this.endpointsRepository.getLatestSchemaVersion(endpointId);
    return latestSchema?.fields || [];
  }

  async updateSchemaField(
    endpointId: number,
    fieldId: number,
    dto: UpdateFieldDto,
    editorIdentity: string,
  ): Promise<void> {
    const endpoint =
      await this.endpointsRepository.findEndpointById(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema =
      await this.endpointsRepository.getLatestSchemaVersion(endpointId);
    if (!latestSchema) {
      throw new Error('No schema found for endpoint');
    }

    const schema = latestSchema.fields;
    const fieldIndex = fieldId - 1;
    if (fieldIndex < 0 || fieldIndex >= schema.length) {
      throw new Error('Field not found');
    }

    schema[fieldIndex] = { ...schema[fieldIndex], ...dto };

    await this.endpointsRepository.createSchemaVersion(
      endpointId,
      schema,
      editorIdentity,
    );

    await this.auditService.logDraftSaved(
      editorIdentity,
      `endpoint_${endpointId}`,
      {
        action: 'field_updated',
        fieldName: schema[fieldIndex].name,
        changes: dto,
      },
    );
  }

  async toggleFieldRequired(
    endpointId: number,
    fieldId: number,
    isRequired: boolean,
    editorIdentity: string,
  ): Promise<void> {
    const endpoint =
      await this.endpointsRepository.findEndpointById(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema =
      await this.endpointsRepository.getLatestSchemaVersion(endpointId);
    if (!latestSchema) {
      throw new Error('No schema found for endpoint');
    }

    const schema = latestSchema.fields;
    const fieldIndex = fieldId - 1;
    if (fieldIndex < 0 || fieldIndex >= schema.length) {
      throw new Error('Field not found');
    }

    schema[fieldIndex].isRequired = isRequired;

    await this.endpointsRepository.createSchemaVersion(
      endpointId,
      schema,
      editorIdentity,
    );

    await this.auditService.logDraftSaved(
      editorIdentity,
      `endpoint_${endpointId}`,
      {
        action: 'field_required_toggled',
        fieldName: schema[fieldIndex].name,
        changes: { isRequired },
      },
    );
  }

  async addSchemaField(
    endpointId: number,
    dto: AddFieldDto,
    editorIdentity: string,
  ): Promise<SchemaField> {
    const endpoint =
      await this.endpointsRepository.findEndpointById(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema =
      await this.endpointsRepository.getLatestSchemaVersion(endpointId);
    const schema = latestSchema?.fields || [];

    const newField: SchemaField = {
      name: dto.name,
      path: dto.path,
      type: dto.type,
      isRequired: dto.isRequired,
      arrayElementType: dto.arrayElementType,
    };

    schema.push(newField);

    await this.endpointsRepository.createSchemaVersion(
      endpointId,
      schema,
      editorIdentity,
    );

    await this.auditService.logDraftSaved(
      editorIdentity,
      `endpoint_${endpointId}`,
      {
        action: 'field_added',
        fieldName: newField.name,
        field: newField,
      },
    );

    return newField;
  }

  async removeSchemaField(
    endpointId: number,
    fieldId: number,
    editorIdentity: string,
  ): Promise<void> {
    const endpoint =
      await this.endpointsRepository.findEndpointById(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema =
      await this.endpointsRepository.getLatestSchemaVersion(endpointId);
    if (!latestSchema) {
      throw new Error('No schema found for endpoint');
    }

    const schema = latestSchema.fields;
    const fieldIndex = fieldId - 1;
    if (fieldIndex < 0 || fieldIndex >= schema.length) {
      throw new Error('Field not found');
    }

    const removedField = schema.splice(fieldIndex, 1)[0];

    await this.endpointsRepository.createSchemaVersion(
      endpointId,
      schema,
      editorIdentity,
    );

    await this.auditService.logDraftSaved(
      editorIdentity,
      `endpoint_${endpointId}`,
      {
        action: 'field_removed',
        fieldName: removedField.name,
        field: removedField,
      },
    );
  }

  async reorderSchemaFields(
    endpointId: number,
    fieldIds: number[],
    editorIdentity: string,
  ): Promise<void> {
    const endpoint =
      await this.endpointsRepository.findEndpointById(endpointId);
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema =
      await this.endpointsRepository.getLatestSchemaVersion(endpointId);
    if (!latestSchema) {
      throw new Error('No schema found for endpoint');
    }

    const schema = latestSchema.fields;

    const maxIndex = schema.length;
    const invalidIds = fieldIds.filter((id) => id < 1 || id > maxIndex);
    if (invalidIds.length > 0) {
      throw new Error(`Invalid field IDs: ${invalidIds.join(', ')}`);
    }

    const reorderedSchema = fieldIds.map((id) => schema[id - 1]);

    await this.endpointsRepository.createSchemaVersion(
      endpointId,
      reorderedSchema,
      editorIdentity,
    );

    await this.auditService.logDraftSaved(
      editorIdentity,
      `endpoint_${endpointId}`,
      {
        action: 'fields_reordered',
        newOrder: fieldIds,
      },
    );
  }
}
