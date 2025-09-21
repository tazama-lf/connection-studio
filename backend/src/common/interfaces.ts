export enum TransactionType {
  TRANSFERS = 'Transfers',
  PAYMENTS = 'Payments',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export enum ContentType {
  JSON = 'application/json',
  XML = 'application/xml',
}

export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
}

export enum EndpointStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  READY_FOR_DEPLOYMENT = 'READY_FOR_DEPLOYMENT',
  DEPLOYED = 'DEPLOYED',
  SUSPENDED = 'SUSPENDED',
}

export interface SchemaField {
  name: string;
  path: string;
  type: FieldType;
  isRequired: boolean;
  children?: SchemaField[];
  arrayElementType?: FieldType;
}

export interface EndpointSchema {
  version: number;
  fields: SchemaField[];
  createdBy: string;
  createdAt: Date;
}

export interface Endpoint {
  id: number;
  path: string;
  method: HttpMethod;
  version: string;
  transactionType: TransactionType;
  status: EndpointStatus;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  currentSchema?: EndpointSchema;
}
