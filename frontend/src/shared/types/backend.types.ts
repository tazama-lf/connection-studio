export const TransactionType = {
  TRANSFERS: 'Transfers',
  PAYMENTS: 'Payments',
} as const;

export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
} as const;

export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

export const ContentType = {
  JSON: 'application/json',
  XML: 'application/xml',
} as const;

export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export const FieldType = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  OBJECT: 'object',
  ARRAY: 'array',
} as const;

export type FieldType = (typeof FieldType)[keyof typeof FieldType];

export const EndpointStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  STATUS_01_IN_PROGRESS: 'IN_PROGRESS',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  UNDER_REVIEW: 'UNDER_REVIEW',
  READY_FOR_DEPLOYMENT: 'READY_FOR_DEPLOYMENT',
  DEPLOYED: 'DEPLOYED',
  SUSPENDED: 'SUSPENDED',
  PUBLISHED: 'PUBLISHED',
  DEPRECATED: 'DEPRECATED',
} as const;

export type EndpointStatus =
  (typeof EndpointStatus)[keyof typeof EndpointStatus];

export const MappingStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DRAFT: 'DRAFT',
  ARCHIVED: 'ARCHIVED',
} as const;

export type MappingStatus = (typeof MappingStatus)[keyof typeof MappingStatus];

export const TransformationType = {
  DIRECT: 'DIRECT',
  AGGREGATION: 'AGGREGATION',
  CALCULATION: 'CALCULATION',
  LOOKUP: 'LOOKUP',
  CONDITIONAL: 'CONDITIONAL',
} as const;

export type TransformationType =
  (typeof TransformationType)[keyof typeof TransformationType];

// Backend DTOs and Response Types

export interface CreateEndpointRequest {
  path: string;
  method: HttpMethod;
  version: string;
  transactionType: TransactionType;
  description?: string;
  samplePayload: string;
  contentType: ContentType;
}

export interface EndpointResponse {
  id: number;
  path: string;
  method: HttpMethod;
  version: string;
  transactionType: TransactionType;
  description?: string;
  samplePayload: string;
  contentType: ContentType;
  status: EndpointStatus;
  createdAt: string;
  updatedAt: string;
  schemaVersion?: {
    id: number;
    fields: SchemaFieldResponse[];
  };
}

export interface SchemaFieldResponse {
  id: number;
  path: string;
  type: FieldType;
  isRequired: boolean;
  description?: string;
}

export interface InferSchemaRequest {
  payload: string;
  contentType: ContentType;
}

export interface InferSchemaResponse {
  schemaVersion: {
    id: number;
    fields: SchemaFieldResponse[];
  };
  summary: {
    totalFields: number;
    requiredFields: number;
    optionalFields: number;
  };
}

export interface CreateMappingRequest {
  name: string;
  endpointId?: number;
  sourceFields: {
    path: string;
    type: string;
    isRequired: boolean;
  }[];
  destinationFields: {
    path: string;
    type: string;
    isRequired: boolean;
  }[];
  transformation: TransformationType;
}

export interface UpdateMappingRequest {
  name?: string;
  sourceFields?: {
    path: string;
    type: string;
    isRequired: boolean;
  }[];
  destinationFields?: {
    path: string;
    type: string;
    isRequired: boolean;
  }[];
  transformation?: TransformationType;
  status?: MappingStatus;
}

export interface MappingResponse {
  id: string;
  name: string;
  endpointId?: number;
  sourceFields: {
    path: string;
    type: string;
    isRequired: boolean;
  }[];
  destinationFields: {
    path: string;
    type: string;
    isRequired: boolean;
  }[];
  transformation: TransformationType;
  status: MappingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SimulateRequest {
  mappingId: string;
  sampleData: Record<string, unknown>;
}

export interface SimulateResponse {
  success: boolean;
  transformedData?: Record<string, unknown>;
  errors?: string[];
  warnings?: string[];
}

export interface PublishRequest {
  mappingId: string;
  deploymentNotes?: string;
}

export interface PublishResponse {
  success: boolean;
  deploymentId: string;
  publishedAt: string;
  message: string;
}
