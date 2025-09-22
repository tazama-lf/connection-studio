// Status constants used across features
export const ENDPOINT_STATUS = {
  IN_PROGRESS: 'In-Progress',
  READY_FOR_APPROVAL: 'Ready for Approval',
  SUSPENDED: 'Suspended',
  CLONED: 'Cloned',
} as const;

export type EndpointStatus =
  (typeof ENDPOINT_STATUS)[keyof typeof ENDPOINT_STATUS];

// Workflow status
export const WORKFLOW_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
} as const;

export type WorkflowStatus =
  (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

// Configuration types
export const CONFIGURATION_TYPE = {
  PULL: 'pull',
  PUSH: 'push',
} as const;

export type ConfigurationType =
  (typeof CONFIGURATION_TYPE)[keyof typeof CONFIGURATION_TYPE];

// Source types for data enrichment
export const SOURCE_TYPE = {
  SFTP: 'sftp',
  HTTP: 'http',
} as const;

export type SourceType = (typeof SOURCE_TYPE)[keyof typeof SOURCE_TYPE];

// File formats
export const FILE_FORMAT = {
  CSV: 'csv',
  JSON: 'json',
  XML: 'xml',
} as const;

export type FileFormat = (typeof FILE_FORMAT)[keyof typeof FILE_FORMAT];

// Transaction types
export const TRANSACTION_TYPE = {
  TRANSFERS: 'transfers',
  PAYMENTS: 'payments',
} as const;

export type TransactionType =
  (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];
