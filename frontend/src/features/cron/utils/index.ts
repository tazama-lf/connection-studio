import { CRON_JOB_ERROR_MESSAGES } from '../constants';
import type { ScheduleResponse } from '../types';
import * as yup from 'yup';

const HTTP_BAD_REQUEST = 400;
const HTTP_CONFLICT = 409;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_SERVER_ERROR_MIN = 500;
const MIN_NAME_LENGTH = 2;

const isResponseError = (error: unknown): error is { response: { status: number; data?: { message?: string } } } => (
  typeof error === 'object' &&
  error !== null &&
  'response' in error &&
  typeof (error as { response?: unknown }).response === 'object' &&
  (error as { response?: unknown }).response !== null &&
  'status' in ((error as { response: unknown }).response as object)
);

const hasMessage = (error: unknown): error is { message: string } => (
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof (error as { message?: unknown }).message === 'string'
);

const getStatusErrorMessage = (status: number): string | null => {
  if (status === HTTP_BAD_REQUEST) {
    return CRON_JOB_ERROR_MESSAGES.INVALID_INPUT;
  }
  if (status === HTTP_CONFLICT) {
    return CRON_JOB_ERROR_MESSAGES.DUPLICATE_NAME;
  }
  if (status === HTTP_UNAUTHORIZED || status === HTTP_FORBIDDEN) {
    return CRON_JOB_ERROR_MESSAGES.UNAUTHORIZED;
  }
  if (status >= HTTP_SERVER_ERROR_MIN) {
    return CRON_JOB_ERROR_MESSAGES.SERVER_ERROR;
  }
  return null;
};

export const getCronJobErrorMessage = (error: unknown): string => {
  if (isResponseError(error)) {
    const statusMessage = getStatusErrorMessage(error.response.status);
    if (statusMessage) {
      return statusMessage;
    }
    if (error.response.data?.message) {
      return error.response.data.message;
    }
  }

  if (hasMessage(error)) {
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return CRON_JOB_ERROR_MESSAGES.NETWORK_ERROR;
    }
    return error.message;
  }

  return CRON_JOB_ERROR_MESSAGES.GENERAL;
};

export const formatScheduleForEdit = (schedule: ScheduleResponse): {
  id: string;
  name: string;
  cronExpression: string;
  iterations: number;
  schedule_status: string;
  startDate: string;
  endDate: string;
  status: string;
  comments: string;
} => ({
  id: schedule.id,
  name: schedule.name,
  cronExpression: schedule.cron,
  iterations: schedule.iterations,
  schedule_status: schedule.schedule_status,
  startDate: schedule.start_date ?? '',
  endDate: schedule.end_date ?? '',
  status: schedule.status ?? '',
  comments: schedule.comments ?? '',
});

export const validationSchema = yup.object().shape({
  name: yup
    .string()
    .required('Job name is required')
    .min(MIN_NAME_LENGTH, `Job name must be at least ${MIN_NAME_LENGTH} characters`)
    .max(50, 'Job name must not exceed 50 characters'),
  cronExpression: yup.string().required('Cron expression is required'),
  iterations: yup
    .number()
    .transform((value, originalValue): number | undefined => {
      if (
        originalValue === '' ||
        originalValue === null ||
        originalValue === undefined
      ) {
        return undefined;
      }
      return value;
    })
    .required('Iterations is required')
    .min(1, 'Iterations must be at least 1')
    .max(1000, 'Iterations must not exceed 1000')
    .integer('Iterations must be a whole number'),
});
