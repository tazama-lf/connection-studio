import { ENV } from '@shared/config/environment.config';
import { getDemsStatusLov } from '@shared/lovs';
import { apiRequest } from '@utils/common/apiHelper';
import { getCronJobErrorMessage, formatScheduleForEdit } from '../utils';
import type {
  ScheduleRequest,
  ScheduleCreateResponse,
  ScheduleResponse,
  PaginationParams,
  PaginatedScheduleResponse,
} from '../types';
import { CRON_JOB_SUCCESS_MESSAGES, CRON_JOB_STATUSES } from '../constants';

const { API_BASE_URL } = ENV;

export const cronJobApi = {
  getList: async (
    params: PaginationParams,
    searchingFilters?: Record<string, unknown>,
  ): Promise<PaginatedScheduleResponse> => {
    const url = `${API_BASE_URL}/scheduler/all?${params?.offset !== undefined ? `offset=${params.offset}&` : ''}${params?.limit !== undefined ? `limit=${params.limit}` : ''}`;

    const { status, ...otherFilters } = searchingFilters ?? {};
    let statusFilter;

    if (!status) {
      const userRole = params.userRole as keyof typeof getDemsStatusLov;
      statusFilter =
        getDemsStatusLov[userRole]?.map((item) => item.value)?.join(',') ??
        '';
    }

    const requestBody = {
      ...otherFilters,
      status: status ?? statusFilter,
    };

    return await apiRequest<PaginatedScheduleResponse>(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  },

  create: async (data: ScheduleRequest): Promise<ScheduleCreateResponse> =>
    await apiRequest<ScheduleCreateResponse>(
      `${API_BASE_URL}/scheduler/create`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  getAll: async (offset = 0, limit = 50): Promise<ScheduleResponse[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('offset', offset.toString());
    queryParams.append('limit', limit.toString());

    const scheduler_body = {
      status: 'STATUS_04_APPROVED,STATUS_06_EXPORTED',
    };

    return await apiRequest<ScheduleResponse[]>(
      `${API_BASE_URL}/scheduler/all?${queryParams.toString()}`,
      {
        method: 'POST',
        body: JSON.stringify(scheduler_body),
      },
    );
  },

  getById: async (id: string): Promise<ScheduleResponse> =>
    await apiRequest<ScheduleResponse>(
      `${API_BASE_URL}/scheduler/${id}`,
    ),

  update: async (
    id: string,
    updates: Partial<ScheduleRequest>,
  ): Promise<{ success: boolean; message: string }> =>
    await apiRequest<{ success: boolean; message: string }>(
      `${API_BASE_URL}/scheduler/update/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: updates?.name,
          start_date: updates?.start_date,
          iterations: Number(updates?.iterations),
          cron: updates?.cron,
        }),
      },
    ),

  updateStatus: async (
    id: string,
    status: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> => {
    const queryParams = new URLSearchParams();
    queryParams.append('status', status);

    return await apiRequest<{ success: boolean; message: string }>(
      `${API_BASE_URL}/scheduler/update/status/${id}?${queryParams.toString()}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          reason: reason ?? '',
        }),
      },
    );
  },
};

export const submitCronJob = async (data: unknown) => {
  const formData = data as ScheduleRequest & { cronExpression?: string };
  const scheduleData: ScheduleRequest = {
    name: formData.name?.trim() ?? '',
    cron: (formData.cron ?? formData.cronExpression ?? '').trim(),
    iterations: formData.iterations ?? 0,
  };

  return await cronJobApi.create(scheduleData);
};

export const rejectSchedule = async (scheduleId: string, reason?: string) =>
  await cronJobApi.updateStatus(scheduleId, CRON_JOB_STATUSES.REJECTED, reason);

export const exportSchedule = async (scheduleId: string) =>
  await cronJobApi.updateStatus(scheduleId, CRON_JOB_STATUSES.EXPORTED);

export const updateScheduleData = async (
  scheduleId: string,
  payload: { name: string; cron: string; iterations: number },
) => await cronJobApi.update(scheduleId, payload);

export const sendForApproval = async (scheduleId: string) =>
  await cronJobApi.updateStatus(scheduleId, CRON_JOB_STATUSES.UNDER_REVIEW);

export const prepareScheduleForEdit = (schedule: ScheduleResponse) =>
  formatScheduleForEdit(schedule);

export const getErrorMessage = (error: unknown) =>
  getCronJobErrorMessage(error);

export const loadSchedules = async (
  pageNumber: number,
  itemsPerPage: number,
  userRole: string,
  searchingFilters: Record<string, unknown>,
): Promise<PaginatedScheduleResponse> => {
  const limit: number = itemsPerPage;
  const offset: number = pageNumber - 1;
  const params = { limit, offset, userRole };

  return await cronJobApi.getList(params, searchingFilters);
};

export { CRON_JOB_SUCCESS_MESSAGES, CRON_JOB_STATUSES };
