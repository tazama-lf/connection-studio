import { HttpService } from '@nestjs/axios';
import {
  CONFIG_URL,
  CONFIG_WRITE_URL,
  CONFIG_STATUS_URL,
  DATA_MODEL_COLLECTIONS_URL,
  DESTINATION_TYPES_URL,
  TRANSACTION_TYPE_TABLE_URL,
  DATA_MODEL_TABLE_URL,
  DEV_BASE_URL,
} from '../constants/constant';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Config,
  ConfigType,
  ISuccess,
  Job,
  JobStatus,
  JobSummary,
  PaginatedResult,
  PullJobHistory,
  Schedule,
  ScheduleStatus,
} from '@tazama-lf/tcs-lib';
import { firstValueFrom } from 'rxjs';
import { AuthenticatedUser } from '../auth/auth.types';
import { UpdatePullJobDto } from '../job/dto/update-pull-job.dto';
import { UpdatePushJobDto } from '../job/dto/update-push-job.dto';
import { UpdateScheduleJobDto } from '../scheduler/dto/update-schedule-dto';

@Injectable()
export class AdminServiceClient {
  private readonly logger = new Logger(AdminServiceClient.name);
  private readonly adminServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.adminServiceUrl =
      this.configService.get<string>('ADMIN_SERVICE_URL') ?? DEV_BASE_URL
  }

  private getAuthHeaders(token: string): Record<string, string> {
    return {
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    };
  }
  /**
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH)
   * @param path - API path (e.g., '/v1/admin/tcs/config/123')
   * @param body - Request body (for POST, PUT, PATCH)
   * @param headers - Additional headers to include
   * @returns Response from admin-service
   */
  private async executeHttpRequest<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    token: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.adminServiceUrl}${path}`;
    const headers = this.getAuthHeaders(token);

    this.logger.log(`Making ${method} request to: ${url}`);
    if (body) {
      this.logger.debug(`Request body: ${JSON.stringify(body).substring(0, 200)}...`);
    }

    try {
      let response;
      switch (method) {
        case 'GET':
          response = await firstValueFrom(this.httpService.get(url, { headers }));
          break;
        case 'POST':
          response = await firstValueFrom(this.httpService.post(url, body, { headers }));
          break;
        case 'PUT':
          response = await firstValueFrom(this.httpService.put(url, body, { headers }));
          break;
        case 'DELETE':
          response = await firstValueFrom(this.httpService.delete(url, { headers, data: body }));
          break;
        case 'PATCH':
          response = await firstValueFrom(this.httpService.patch(url, body, { headers }));
          break;
      }

      this.logger.log(`${method} ${path} - Success (${response.status})`);
      this.logger.debug(`Response data: ${JSON.stringify(response.data).substring(0, 200)}...`);

      return response.data as T;
    } catch (error) {
      return this.handleError(error, `${method} ${path}`);
    }
  }


  private handleError(error: unknown, operation: string): never {
    const err = error as {
      response?: { status: number; data: unknown };
      request?: unknown;
      message: string;
    };
    if (err.response) {
      const { status, data } = err.response;
      this.logger.error(
        `${operation} failed with status ${status}: ${JSON.stringify(data)}`,
      );

      const message =
        data &&
        typeof data === 'object' &&
        'message' in data &&
        typeof data.message === 'string'
          ? data.message
          : 'Admin service returned an error response';

      throw new HttpException(message, status ?? HttpStatus.BAD_GATEWAY);
    } else if (err.request) {
      this.logger.error(
        `${operation} - No response from admin-service: ${err.message}`,
      );
      throw new HttpException(
        'Admin service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else {
      this.logger.error(`${operation} - Error: ${err.message}`);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  async forwardRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    const url = `${this.adminServiceUrl}${path}`;
    if (body) {
      this.logger.debug(
        `Request body: ${JSON.stringify(body).substring(0, 200)}...`,
      );
    }
    if (headers) {
      this.logger.debug(`Request headers: ${JSON.stringify(headers)}`);
    }

    try {
      let response;

      switch (method) {
        case 'GET':
          response = await firstValueFrom(
            this.httpService.get(url, { headers }),
          );
          break;

        case 'POST':
          response = await firstValueFrom(
            this.httpService.post(url, body, { headers }),
          );
          break;

        case 'PUT':
          response = await firstValueFrom(
            this.httpService.put(url, body, { headers }),
          );
          break;

        case 'DELETE':
          response = await firstValueFrom(
            this.httpService.delete(url, { headers, data: body }),
          );
          break;

        case 'PATCH':
          response = await firstValueFrom(
            this.httpService.patch(url, body, { headers }),
          );
          break;
      }

      this.logger.log(`${method} ${path} - Success (${response.status})`);
      this.logger.debug(
        `Response data: ${JSON.stringify(response.data).substring(0, 200)}...`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(`${method} ${path} - Failed: ${error.message}`);

      if (error.response) {
        const { status, data } = error.response;
        this.logger.error(
          `Admin-service error (${status}): ${JSON.stringify(data)}`,
        );

        const message =
          data &&
          typeof data === 'object' &&
          'message' in data &&
          typeof data.message === 'string'
            ? data.message
            : typeof data === 'string'
              ? data
              : 'Request failed';

        throw new HttpException(message, status);
      } else if (error.request) {
        this.logger.error(`No response from admin-service: ${error.message}`);
        throw new HttpException(
          'Admin service is unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        this.logger.error(`Request setup error: ${error.message}`);
        throw new HttpException(
          'Internal server error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  // ==================== JOB OPERATIONS ====================

  async createPushJob(job: Partial<Job>, token: string): Promise<ISuccess> {
    this.logger.log('Validating job creation');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/push/create`,
          job,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Validation response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, 'jobCreation');
    }
  }

  async createPullJob(job: Partial<Job>, token: string): Promise<ISuccess> {
    this.logger.log('Validating job creation');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/pull/create`,
          job,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Validation response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, 'jobCreation');
    }
  }

  async getAllJobs(
    offset: string,
    limit: string,
    user: AuthenticatedUser,
    filters?: Record<string, unknown>,
  ): Promise<PaginatedResult<Job>> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/job/get/all`,
          {
            ...filters,
          },
          {
            headers: {
              Authorization: `Bearer ${user.token.tokenString}`,
            },
            params: {
              offset,
              limit,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'getAllJobs');
    }
  }

  async getAllJobsHistory(
    offset: string,
    limit: string,
    user: AuthenticatedUser,
    filters?: Record<string, unknown>,
  ): Promise<PaginatedResult<PullJobHistory>> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/job/get/history`,
          {
            ...filters,
          },
          {
            headers: {
              Authorization: `Bearer ${user.token.tokenString}`,
            },
            params: {
              offset,
              limit,
            },
          },
        ),
      );
      return response.data;
    } catch (error) {
      return this.handleError(error, 'getAllJobsHistory');
    }
  }

  async findJobById(
    id: string,
    tableName: string,
    token: string,
  ): Promise<Job | null> {
    this.logger.log(`Getting job by ID: ${id} with token ${token}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminServiceUrl}/v1/admin/tcs/job/get/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },

            params: {
              tableName,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'getJobById');
    }
  }

  async findJobByStatus(
    tenantId: string,
    status: JobStatus,
    page: number,
    limit: number,
    token: string,
  ): Promise<JobSummary[]> {
    this.logger.log('Getting job by status');

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminServiceUrl}/v1/admin/tcs/job/get/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              tenantId,
              status,
              page,
              limit,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'getJobById');
    }
  }

  async updateJobActivation(
    id: string,
    status: ScheduleStatus,
    type: ConfigType,
    token: string,
  ): Promise<{ success: boolean; message: string; data: Job }> {
    this.logger.log(`Validating job update with id : ${id}`);

    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.adminServiceUrl}/v1/admin/tcs/job/update/activation/${id}`,
          { status, type },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Validation response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, 'jobActivation');
    }
  }

  async updateJobByStatus(
    id: string,
    status: JobStatus,
    tenantId: string,
    type: ConfigType,
    token: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Validating job update with id : ${id}`);

    try {
      const body: Record<string, unknown> = {};
      if (reason) body.reason = reason;
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.adminServiceUrl}/v1/admin/tcs/job/update/status/${id}`,
          body,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            params: {
              tenantId,
              type,
              status,
            },
          },
        ),
      );

      this.logger.log(`Validation response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, 'updateScheduleStatus');
    }
  }

  async updateJob(
    id: string,
    job: UpdatePushJobDto | UpdatePullJobDto,
    type: ConfigType,
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Validating job update with id : ${id}`);

    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.adminServiceUrl}/v1/admin/tcs/job/update/${id}`,
          { job, type },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Validation response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, 'scheduleCreation');
    }
  }

  // ==================== SCHEDULER OPERATIONS ====================

  async createSchedule(
    schedule: Partial<Schedule>,
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('Validating schedule creation');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/schedule/create`,
          schedule,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Validation response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, 'scheduleCreation');
    }
  }

  async findScheduleById(id: string, token: string): Promise<Schedule | null> {
    this.logger.log(`Getting schedule by ID: ${id} with token ${token}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminServiceUrl}/v1/admin/tcs/schedule/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'getScheduleById');
    }
  }

  async updateSchedule(
    id: string,
    schedule: UpdateScheduleJobDto,
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Validating schedule update with id : ${id}`);

    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.adminServiceUrl}/v1/admin/tcs/schedule/update/${id}`,
          schedule,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Validation response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, 'scheduleCreation');
    }
  }

  async getAllSchedule(
    offset: string,
    limit: string,
    user: AuthenticatedUser,
    filters?: Record<string, unknown>,
  ): Promise<PaginatedResult<Schedule>> {
    this.logger.log('Getting all schedules');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/schedule/get/all`,
          {
            ...filters,
          },
          {
            headers: {
              Authorization: `Bearer ${user.token.tokenString}`,
            },
            params: {
              offset,
              limit,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'getScheduleByStatus');
    }
  }

  async getScheduleByStatus(
    status: JobStatus,
    page: number,
    limit: number,
    tenantId: string,
    token: string,
  ): Promise<Schedule[]> {
    this.logger.log(`Getting schedules with statuses: ${status}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminServiceUrl}/v1/admin/tcs/schedule/get/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              status,
              tenantId,
              page,
              limit,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'getScheduleByStatus');
    }
  }

  async updateScheduleByStatus(
    id: string,
    status: JobStatus,
    tenantId: string,
    token: string,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Validating schedule update with id : ${id}`);

    try {
      const body: Record<string, unknown> = { tenantId };
      if (reason) body.reason = reason;
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.adminServiceUrl}/v1/admin/tcs/schedule/update/status/${id}`,
          body,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            params: {
              status,
            },
          },
        ),
      );

      this.logger.log(`Validation response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      return this.handleError(error, 'updateScheduleStatus');
    }
  }

  // ==================== TCS OPERATIONS ====================

  async getConfigById(id: number, token: string): Promise<any> {
    const response = await this.executeHttpRequest<{ config?: any }>(
      'GET',
      `${CONFIG_URL}/${id}`,
      token,
    );

    if (!response.config) {
      this.logger.warn(`Config ${id} not found in admin-service response`);
      return null;
    }

    return response.config;
  }
  async updateConfigStatus(
    id: number,
    status: string,
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    return await this.executeHttpRequest<{ success: boolean; message: string }>(
      'PUT',
      `${CONFIG_STATUS_URL}/${id}`,
      token,
      { status },
    );
  }
  async getAllConfigs(
    token: string,
    limit = 10,
    offset = 0,
  ): Promise<{
    configs: any[];
    pagination: { total: number; limit: number; offset: number; pages: number };
  }> {
    const response = await this.executeHttpRequest<{
      configs: any[];
      pagination: { total: number; limit: number; offset: number; pages: number };
    }>(
      'POST',
      `${CONFIG_URL}/${offset}/${limit}`,
      token,
      {},
    );

    return {
      configs: response.configs ?? [],
      pagination: response.pagination ?? {
        total: 0,
        limit,
        offset,
        pages: 0,
      },
    };
  }

  async writeConfig(configData: any, token: string): Promise<any> {
    const response = await this.executeHttpRequest<{ config: any }>(
      'POST',
      CONFIG_WRITE_URL,
      token,
      configData,
    );

    return response.config;
  }

  async writeConfigUpdate(
    id: number,
    updateData: any,
    token: string,
  ): Promise<any> {
    return await this.executeHttpRequest(
      'PUT',
      `${CONFIG_URL}/${id}/write`,
      token,
      updateData,
    );
  }

  async writeConfigDelete(id: number, token: string): Promise<void> {
    await this.executeHttpRequest(
      'DELETE',
      `${CONFIG_URL}/${id}/write`,
      token,
    );
  }

  async updateConfigByStatus(
    id: number,
    status: string,
    token: string,
    comment?: string,
  ): Promise<Config | null> {
    const body: any = { status };
    if (comment !== undefined) {
      body.comments = comment;
    }

    const response = await this.executeHttpRequest<{ config: Config }>(
      'PUT',
      `${CONFIG_URL}/${id}/write`,
      token,
      body,
    );

    return response.config;
  }
  async findConfigsByStatus(
    filters: {
      tenantId: string;
      status?: string;
      endpointPath?: string;
      version?: string;
      transactionType?: string;
      createdDate?: string;
      limit?: number;
      offset?: number;
    },
    token: string,
  ): Promise<{
    configs: any[];
    pagination: { total: number; limit: number; offset: number; pages: number };
  }> {
    const { limit = 10, offset = 0, ...filterPayload } = filters;

    const response = await this.executeHttpRequest<{
      configs: any[];
      pagination: { total: number; limit: number; offset: number; pages: number };
    }>(
      'POST',
      `${CONFIG_URL}/${offset}/${limit}`,
      token,
      filterPayload,
    );

    return {
      configs: response.configs ?? [],
      pagination: response.pagination ?? {
        total: 0,
        limit,
        offset,
        pages: 0,
      },
    };
  }

  async updatePublishingStatus(
    id: number,
    publishingStatus: 'active' | 'inactive',
    token: string,
  ): Promise<any> {
    return await this.executeHttpRequest(
      'PATCH',
      `${CONFIG_URL}/${id}/publishing-status`, 
      token,
      { publishing_status: publishingStatus },
    );
  }

  async getAllConfigsWithFilters(
    offset: number,
    limit: number,
    filters: Record<string, any>,
    token: string,
  ): Promise<Config[]> {
    return await this.executeHttpRequest<Config[]>(
      'POST',
      `${CONFIG_URL}/${offset}/${limit}`,
      token,
      filters,
    );
  }

  async addMapping(id: number, mappingData: any, token: string): Promise<any> {
    return await this.executeHttpRequest(
      'POST',
      `${CONFIG_URL}/${id}/mapping`,
      token,
      mappingData,
    );
  }

  async removeMapping(id: number, index: number, token: string): Promise<any> {
    return await this.executeHttpRequest(
      'DELETE',
      `${CONFIG_URL}/${id}/mapping/${index}`,
      token,
    );
  }

  async addFunction(
    id: number,
    functionData: any,
    token: string,
  ): Promise<any> {
    return await this.executeHttpRequest(
      'POST',
      `${CONFIG_URL}/${id}/function`,
      token,
      functionData,
    );
  }

  async removeFunction(id: number, index: number, token: string): Promise<any> {
    return await this.executeHttpRequest(
      'DELETE',
      `${CONFIG_URL}/${id}/function/${index}`,
      token,
    );
  }

  async getAllCollections(tenantId: string, token: string): Promise<any> {
    return await this.executeHttpRequest(
      'GET',
      `${DATA_MODEL_COLLECTIONS_URL}/${tenantId}`,
      token,
    );
  }

  async createDestinationType(
    dto: {
      collection_type: string;
      name: string;
      description?: string;
      destination_id: number;
    },
    token: string,
  ): Promise<any> {
    return await this.executeHttpRequest(
      'POST',
      DESTINATION_TYPES_URL,
      token,
      dto,
    );
  }

  async destinationTypeExists(
    destinationTypeId: number,
    token: string,
  ): Promise<any> {
    return await this.executeHttpRequest(
      'GET',
      `${DESTINATION_TYPES_URL}/${destinationTypeId}/exists`,
      token,
    );
  }

  async addFieldToDestinationType(
    destinationTypeId: number,
    dto: {
      name: string;
      field_type: string;
      parent_id?: number;
      is_active?: boolean;
      serial_no?: number;
    },
    token: string,
  ): Promise<any> {
    return await this.executeHttpRequest(
      'POST',
      `${DESTINATION_TYPES_URL}/${destinationTypeId}/fields`,
      token,
      dto,
    );
  }

  async createTransactionTypeTable(
    transactionType: string,
    token: string,
  ): Promise<void> {
    await this.executeHttpRequest(
      'POST',
      TRANSACTION_TYPE_TABLE_URL,
      token,
      { transactionType },
    );
  }

  async createTazamaDataModelTable(
    tableName: string,
    token: string,
  ): Promise<void> {
    await this.executeHttpRequest(
      'POST',
      DATA_MODEL_TABLE_URL,
      token,
      { tableName },
    );
  }


}
