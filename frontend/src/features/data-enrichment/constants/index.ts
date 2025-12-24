export const DE_JOB_STATUSES = {
  IN_PROGRESS: 'STATUS_01_IN_PROGRESS',
  ON_HOLD: 'STATUS_02_ON_HOLD',
  UNDER_REVIEW: 'STATUS_03_UNDER_REVIEW',
  APPROVED: 'STATUS_04_APPROVED',
  REJECTED: 'STATUS_05_REJECTED',
  EXPORTED: 'STATUS_06_EXPORTED',
  READY_FOR_DEPLOYMENT: 'STATUS_07_READY_FOR_DEPLOYMENT',
  DEPLOYED: 'STATUS_08_DEPLOYED',
} as const;

export type JobStatus =
  (typeof DE_JOB_STATUSES)[keyof typeof DE_JOB_STATUSES];

export const DE_JOB_ERROR_MESSAGES = {
  GENERAL:
    'We encountered an issue while processing your request. Please try again.',
  INVALID_INPUT:
    'The job details are invalid. Please check your input and try again.',
  DUPLICATE_NAME:
    'A job with this name already exists. Please choose a different name.',
  UNAUTHORIZED:
    'You do not have permission to perform this action. Please contact your administrator.',
  SERVER_ERROR:
    'Our service is temporarily unavailable. Please try again in a few minutes.',
  NETWORK_ERROR:
    'Unable to connect to the service. Please check your internet connection and try again.',
  FETCH_FAILED: 'Failed to fetch jobs. Please try again.',
  CREATE_FAILED: 'Failed to create job. Please try again.',
  UPDATE_FAILED: 'Failed to update job. Please try again.',
  DELETE_FAILED: 'Failed to delete job. Please try again.',
  EXPORT_FAILED: 'Failed to export job. Please try again.',
};

export const DE_JOB_SUCCESS_MESSAGES = {
  CREATED: (name: string) => `Job "${name}" created successfully!`,
  UPDATED: 'Job updated successfully',
  DELETED: 'Job deleted successfully',
  EXPORTED: 'Job exported successfully',
  SUBMITTED_FOR_APPROVAL: 'Job submitted for approval',
  APPROVED: 'Job approved successfully',
  REJECTED: 'Job rejected successfully',
  STATUS_UPDATED: 'Job status updated successfully',
};

export const DE_JOB_FORM_DEFAULTS = {
  endpoint_name: '',
  schedule_id: '',
  source_type: 'HTTP' as const,
  description: '',
  table_name: '',
  config_type: 'Pull' as const,
};

export const DE_JOB_EDIT_FORM_DEFAULTS = {
  id: '',
  endpoint_name: '',
  schedule_id: '',
  source_type: 'HTTP' as const,
  description: '',
  table_name: '',
  config_type: 'Pull' as const,
  job_status: '',
  comments: '',
};

export const SOURCE_TYPES = {
  HTTP: 'HTTP',
  SFTP: 'SFTP',
} as const;

export const CONFIG_TYPES = {
  PULL: 'Pull',
  PUSH: 'Push',
} as const;

export const AUTH_TYPES = {
  USERNAME_PASSWORD: 'USERNAME_PASSWORD',
  PRIVATE_KEY: 'PRIVATE_KEY',
} as const;

export const FILE_TYPES = {
  CSV: 'CSV',
  JSON: 'JSON',
  TSV: 'TSV',
} as const;

export const ENCODING_TYPES = {
  UTF8: 'utf-8',
  ASCII: 'ascii',
  LATIN1: 'latin1',
  UTF16LE: 'utf16le',
} as const;
