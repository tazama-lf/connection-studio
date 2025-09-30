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

    await this.auditService.logSchemaInferred(editorIdentity, 'temp', 'system');

    return schema;
  }

  async createEndpoint(
    dto: CreateEndpointDto,
    createdBy: string,
    tenantId: string,
  ): Promise<{ endpointId: number; schema: SchemaField[] }> {
    const schema = await this.schemaInferenceService.inferSchemaFromPayload(
      dto.samplePayload,
      dto.contentType,
    );

    const validation = this.schemaInferenceService.validateSchema(schema);
    if (!validation.isValid) {
      throw new Error(
        'Schema validation failed: ' + validation.errors.join(', '),
      );
    }

    const endpointId = await this.endpointsRepository.createEndpoint(
      {
        path: dto.path,
        method: dto.method,
        version: dto.version,
        transactionType: dto.transactionType,
        status: EndpointStatus.IN_PROGRESS,
        description: dto.description,
        createdBy,
      },
      tenantId,
    );

    await this.endpointsRepository.createSchemaVersion(
      endpointId,
      schema,
      createdBy,
      tenantId,
    );

    await this.auditService.logEndpointCreated(createdBy, dto.path, tenantId);

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
      'system',
    );

    return validation;
  }

  async getEndpointById(
    id: number,
    tenantId: string,
  ): Promise<Endpoint | null> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      id,
      tenantId,
    );

    if (endpoint) {
      const latestSchema =
        await this.endpointsRepository.getLatestSchemaVersion(id, tenantId);
      if (latestSchema) {
        endpoint.currentSchema = latestSchema;
      }
    }

    return endpoint;
  }

  async getEndpointsByCreator(
    createdBy: string,
    tenantId: string,
  ): Promise<Endpoint[]> {
    return await this.endpointsRepository.findEndpointsByCreator(
      createdBy,
      tenantId,
    );
  }

  async saveEndpointDraft(
    endpointId: number,
    schema: SchemaField[],
    notes: string,
    editorIdentity: string,
    tenantId: string,
  ): Promise<void> {
    const validation = this.schemaInferenceService.validateSchema(schema);
    if (!validation.isValid) {
      throw new Error(
        'Cannot save draft with invalid schema: ' +
          validation.errors.join(', '),
      );
    }

    await this.endpointsRepository.createSchemaVersion(
      endpointId,
      schema,
      editorIdentity,
      tenantId,
    );

    await this.auditService.logDraftSaved(
      editorIdentity,
      'endpoint-' + endpointId,
      tenantId,
    );
  }

  async updateEndpointStatus(
    endpointId: number,
    status: EndpointStatus,
    editorIdentity: string,
    tenantId: string,
  ): Promise<void> {
    await this.endpointsRepository.updateEndpointStatus(
      endpointId,
      status,
      tenantId,
    );

    await this.auditService.logAction({
      action: 'STATUS_UPDATED',
      actor: editorIdentity,
      endpointName: 'endpoint-' + endpointId,
      tenantId,
    });
  }

  async submitEndpointForApproval(
    endpointId: number,
    editorIdentity: string,
    tenantId: string,
  ): Promise<void> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );
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
      tenantId,
    );

    await this.auditService.logAction({
      action: 'SUBMITTED_FOR_APPROVAL',
      actor: editorIdentity,
      endpointName: 'endpoint-' + endpointId,
      tenantId,
    });
  }

  async approveEndpoint(
    endpointId: number,
    approverIdentity: string,
    tenantId: string,
    _comments?: string,
  ): Promise<void> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    if (endpoint.status !== EndpointStatus.PENDING_APPROVAL) {
      throw new Error('Only pending approval endpoints can be approved');
    }

    await this.endpointsRepository.updateEndpointStatus(
      endpointId,
      EndpointStatus.READY_FOR_DEPLOYMENT,
      tenantId,
    );

    await this.auditService.logAction({
      action: 'ENDPOINT_APPROVED',
      actor: approverIdentity,
      endpointName: 'endpoint-' + endpointId,
      tenantId,
    });
  }

  async rejectEndpoint(
    endpointId: number,
    approverIdentity: string,
    tenantId: string,
    _reason: string,
  ): Promise<void> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    if (endpoint.status !== EndpointStatus.PENDING_APPROVAL) {
      throw new Error('Only pending approval endpoints can be rejected');
    }

    await this.endpointsRepository.updateEndpointStatus(
      endpointId,
      EndpointStatus.IN_PROGRESS,
      tenantId,
    );

    await this.auditService.logAction({
      action: 'ENDPOINT_REJECTED',
      actor: approverIdentity,
      endpointName: 'endpoint-' + endpointId,
      tenantId,
    });
  }

  async publishEndpoint(
    endpointId: number,
    publisherIdentity: string,
    tenantId: string,
  ): Promise<void> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    if (endpoint.status !== EndpointStatus.READY_FOR_DEPLOYMENT) {
      throw new Error('Only ready for deployment endpoints can be published');
    }

    await this.endpointsRepository.updateEndpointStatus(
      endpointId,
      EndpointStatus.PUBLISHED,
      tenantId,
    );

    await this.auditService.logAction({
      action: 'ENDPOINT_PUBLISHED',
      actor: publisherIdentity,
      endpointName: 'endpoint-' + endpointId,
      tenantId,
    });
  }

  async getPendingApprovalEndpoints(tenantId: string): Promise<Endpoint[]> {
    return await this.endpointsRepository.findEndpointsByStatus(
      EndpointStatus.PENDING_APPROVAL,
      tenantId,
    );
  }

  async getApprovedEndpoints(tenantId: string): Promise<Endpoint[]> {
    return await this.endpointsRepository.findEndpointsByStatus(
      EndpointStatus.READY_FOR_DEPLOYMENT,
      tenantId,
    );
  }

  async getSchemaFields(
    endpointId: number,
    tenantId: string,
  ): Promise<SchemaField[]> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema = await this.endpointsRepository.getLatestSchemaVersion(
      endpointId,
      tenantId,
    );
    return latestSchema?.fields || [];
  }

  async updateSchemaField(
    endpointId: number,
    fieldId: number,
    dto: UpdateFieldDto,
    editorIdentity: string,
    tenantId: string,
  ): Promise<void> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema = await this.endpointsRepository.getLatestSchemaVersion(
      endpointId,
      tenantId,
    );
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
      tenantId,
    );
  }

  async toggleFieldRequired(
    endpointId: number,
    fieldId: number,
    isRequired: boolean,
    editorIdentity: string,
    tenantId: string,
  ): Promise<void> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema = await this.endpointsRepository.getLatestSchemaVersion(
      endpointId,
      tenantId,
    );
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
      tenantId,
    );
  }

  async addSchemaField(
    endpointId: number,
    dto: AddFieldDto,
    editorIdentity: string,
    tenantId: string,
  ): Promise<SchemaField> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema = await this.endpointsRepository.getLatestSchemaVersion(
      endpointId,
      tenantId,
    );
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
      tenantId,
    );

    return newField;
  }

  async removeSchemaField(
    endpointId: number,
    fieldId: number,
    editorIdentity: string,
    tenantId: string,
  ): Promise<void> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema = await this.endpointsRepository.getLatestSchemaVersion(
      endpointId,
      tenantId,
    );
    if (!latestSchema) {
      throw new Error('No schema found for endpoint');
    }

    const schema = latestSchema.fields;
    const fieldIndex = fieldId - 1;
    if (fieldIndex < 0 || fieldIndex >= schema.length) {
      throw new Error('Field not found');
    }

    schema.splice(fieldIndex, 1);

    await this.endpointsRepository.createSchemaVersion(
      endpointId,
      schema,
      editorIdentity,
      tenantId,
    );
  }

  async reorderSchemaFields(
    endpointId: number,
    fieldIds: number[],
    editorIdentity: string,
    tenantId: string,
  ): Promise<void> {
    const endpoint = await this.endpointsRepository.findEndpointById(
      endpointId,
      tenantId,
    );
    if (!endpoint) {
      throw new Error('Endpoint not found');
    }

    const latestSchema = await this.endpointsRepository.getLatestSchemaVersion(
      endpointId,
      tenantId,
    );
    if (!latestSchema) {
      throw new Error('No schema found for endpoint');
    }

    const schema = latestSchema.fields;

    const maxIndex = schema.length;
    const invalidIds = fieldIds.filter((id) => id < 1 || id > maxIndex);
    if (invalidIds.length > 0) {
      throw new Error('Invalid field IDs: ' + invalidIds.join(', '));
    }

    const reorderedSchema = fieldIds.map((id) => schema[id - 1]);

    await this.endpointsRepository.createSchemaVersion(
      endpointId,
      reorderedSchema,
      editorIdentity,
      tenantId,
    );
  }
}
