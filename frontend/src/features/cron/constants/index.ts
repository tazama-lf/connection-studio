export const CRON_JOB_FORM_DEFAULTS = {
  name: '',
  cronExpression: '',
  iterations: 1,
};

export const CRON_JOB_EDIT_FORM_DEFAULTS = {
  id: '',
  name: '',
  cronExpression: '',
  iterations: 1,
  startDate: '',
  endDate: '',
  status: '',
  schedule_status: '',
  comments: '',
};

export const CRON_JOB_ERROR_MESSAGES = {
  GENERAL:
    'We encountered an issue while creating your schedule. Please try again.',
  INVALID_INPUT:
    'The CRON expression or job details are invalid. Please check your input and try again.',
  DUPLICATE_NAME:
    'A schedule with this name already exists. Please choose a different name.',
  UNAUTHORIZED:
    'You do not have permission to create schedules. Please contact your administrator.',
  SERVER_ERROR:
    'Our service is temporarily unavailable. Please try again in a few minutes.',
  NETWORK_ERROR:
    'Unable to connect to the service. Please check your internet connection and try again.',
};

export const CRON_JOB_SUCCESS_MESSAGES = {
  CREATED: (name: string) => `Schedule "${name}" created successfully!`,
  UPDATED: 'Schedule updated successfully',
  EXPORTED: 'Cron job exported successfully',
  SUBMITTED_FOR_APPROVAL: 'Cron job submitted for approval',
  REJECTED: 'Cron job rejected successfully',
};

export const CRON_JOB_STATUSES = {
  IN_PROGRESS: 'STATUS_01_IN_PROGRESS',
  ON_HOLD: 'STATUS_02_ON_HOLD',
  UNDER_REVIEW: 'STATUS_03_UNDER_REVIEW',
  APPROVED: 'STATUS_04_APPROVED',
  REJECTED: 'STATUS_05_REJECTED',
  EXPORTED: 'STATUS_06_EXPORTED',
  READY_FOR_DEPLOYMENT: 'STATUS_07_READY_FOR_DEPLOYMENT',
  DEPLOYED: 'STATUS_08_DEPLOYED',
} as const;

export type CronJobStatus =
  (typeof CRON_JOB_STATUSES)[keyof typeof CRON_JOB_STATUSES];