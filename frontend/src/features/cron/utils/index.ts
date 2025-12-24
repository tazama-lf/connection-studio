import { CRON_JOB_ERROR_MESSAGES } from '../constants';
import type { ErrorWithResponse, ScheduleResponse } from '../types';
import * as yup from 'yup';

export const getCronJobErrorMessage = (error: unknown): string => {
  const err = error as ErrorWithResponse;

  if (err?.response?.status === 400) {
    return CRON_JOB_ERROR_MESSAGES.INVALID_INPUT;
  }
//
  if (err?.response?.status === 409) {
    return CRON_JOB_ERROR_MESSAGES.DUPLICATE_NAME;
  }

  if (err?.response?.status === 401 || err?.response?.status === 403) {
    return CRON_JOB_ERROR_MESSAGES.UNAUTHORIZED;
  }

  if (err?.response?.status !== undefined && err.response.status >= 500) {
    return CRON_JOB_ERROR_MESSAGES.SERVER_ERROR;
  }

  if (err?.message?.includes('fetch') ?? err?.message?.includes('network')) {
    return CRON_JOB_ERROR_MESSAGES.NETWORK_ERROR;
  }

  if (err?.response?.data?.message) {
    return err.response.data.message;
  }

  if (err?.message) {
    return err.message;
  }

  return CRON_JOB_ERROR_MESSAGES.GENERAL;
};

export const formatScheduleForEdit = (schedule: ScheduleResponse) => ({
  id: schedule.id,
  name: schedule.name,
  cronExpression: schedule.cron,
  iterations: schedule.iterations,
  schedule_status: schedule.schedule_status,
  startDate: schedule.start_date ?? '2025-11-18',
  endDate: schedule.end_date ?? '2025-12-31',
  status: schedule.status ?? '',
  comments: schedule.comments ?? '',
});

export const validationSchema = yup.object().shape({
  name: yup
    .string()
    .required('Job name is required')
    .min(2, 'Job name must be at least 2 characters')
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