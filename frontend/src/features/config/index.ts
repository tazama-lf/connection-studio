// Config feature exports
export * from './services/configApi';
export * from './components';

// Type definitions
export interface Config {
  id: number;
  msgFam: string;
  transactionType: string;
  endpointPath: string;
  version: string;
  contentType: string;
  status: string;
  publishing_status?: 'active' | 'inactive';
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  mapping?: FieldMapping[];
  schema?: JsonSchema;
}

export interface ConfigFilters {
  transactionType?: string;
  search?: string;
  status?: string;
}

export interface ConfigCreateRequest {
  msgFam?: string;
  transactionType: string;
  endpointPath: string;
  version: string;
  contentType: string;
  jsonData: Record<string, unknown>;
  tenantId?: string;
}

export interface FieldMapping {
  source?: string;
  sources?: string[];
  destination: string;
  separator?: string;
  prefix?: string;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, { type?: string; [key: string]: unknown }>;
  required?: string[];
  [key: string]: unknown;
}
