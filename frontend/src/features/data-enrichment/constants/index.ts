export const DATA_ENRICHMENT_ERROR_MESSAGES = {
  GENERAL:
    'We encountered an issue while creating your data enrichment job. Please try again.',
  INVALID_INPUT:
    'The job details are invalid. Please check your input and try again.',
  DUPLICATE_NAME:
    'A job with this name already exists. Please choose a different name.',
  UNAUTHORIZED:
    'You do not have permission to create jobs. Please contact your administrator.',
  SERVER_ERROR:
    'Our service is temporarily unavailable. Please try again in a few minutes.',
  NETWORK_ERROR:
    'Unable to connect to the service. Please check your internet connection and try again.',
  SCHEDULE_NOT_FOUND:
    'The selected schedule is not available or not approved. Please select a different schedule.',
  SCHEDULE_DEPLOYED:
    'Cannot edit this job: The associated schedule has been deployed and cannot be used for creating new job versions.',
  FILE_FORMAT_MISMATCH:
    'File format does not match the file extension. Please ensure they are compatible.',
};

export const DATA_ENRICHMENT_SUCCESS_MESSAGES = {
  CREATED: (name: string) => `Job "${name}" created successfully!`,
  UPDATED: 'Job updated successfully',
  EXPORTED: 'Job exported successfully',
  SUBMITTED_FOR_APPROVAL: 'Job submitted for approval',
  REJECTED: 'Job rejected successfully',
  APPROVED: 'Job approved successfully',
  ACTIVATED: 'Job activated successfully',
  DEACTIVATED: 'Job deactivated successfully',
  RESUMED: 'Job resumed successfully',
  PAUSED: 'Job paused successfully',
};

export const DATA_ENRICHMENT_JOB_STATUSES = {
  IN_PROGRESS: 'STATUS_01_IN_PROGRESS',
  ON_HOLD: 'STATUS_02_ON_HOLD',
  UNDER_REVIEW: 'STATUS_03_UNDER_REVIEW',
  APPROVED: 'STATUS_04_APPROVED',
  REJECTED: 'STATUS_05_REJECTED',
  EXPORTED: 'STATUS_06_EXPORTED',
  READY_FOR_DEPLOYMENT: 'STATUS_07_READY_FOR_DEPLOYMENT',
  DEPLOYED: 'STATUS_08_DEPLOYED',
} as const;

export const FILE_EXTENSION_FORMAT_MAP = {
  csv: ['CSV'] as const,
  tsv: ['TSV'] as const,
  json: ['JSON'] as const,
  txt: ['CSV', 'TSV'] as const,
} as const;

export const SUPPORTED_FILE_EXTENSIONS = ['csv', 'tsv', 'json', 'txt'] as const;
