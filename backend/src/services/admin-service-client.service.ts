import { HttpService } from '@nestjs/axios';
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
      this.configService.get<string>('ADMIN_SERVICE_URL') ??
      'http://localhost:3100';
  }

  /**
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH)
   * @param path - API path (e.g., '/v1/admin/tcs/config/123')
   * @param body - Request body (for POST, PUT, PATCH)
   * @param headers - Additional headers to include
   * @returns Response from admin-service
   */

  async updateConfigStatus(
    id: number,
    status: string,
    token: string,
  ): Promise<{ success: boolean; message: string }> {
    const url = `${this.adminServiceUrl}/v1/admin/tcs/tcs/config/status/${id}`;

    try {
      const response = await firstValueFrom(
        this.httpService.put(
          url,
          { status },
          {
            headers: {
              Authorization: token.startsWith('Bearer ')
                ? token
                : `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message ?? error.message;
      this.logger.error(
        `Failed to update config ${id} status: ${errorMessage}`,
      );
      throw new HttpException(
        errorMessage ?? 'Failed to update config status',
        error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR,
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
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminServiceUrl}/v1/admin/tcs/config/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      if (!response.data?.config) {
        this.logger.warn(`Config ${id} not found in admin-service response`);
        return null;
      }

      return response.data.config;
    } catch (error) {
      return this.handleError(error, 'getConfigById');
    }
  }

  async getAllConfigs(
    token: string,
    limit = 10,
    offset = 0,
  ): Promise<{
    configs: any[];
    pagination: { total: number; limit: number; offset: number; pages: number };
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/config/${offset}/${limit}`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      return {
        configs: response.data.configs ?? [],
        pagination: response.data.pagination ?? {
          total: 0,
          limit,
          offset,
          pages: 0,
        },
      };
    } catch (error) {
      return this.handleError(error, 'getAllConfigs');
    }
  }

  async writeConfig(configData: any, token: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/config/write`,
          configData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data.config;
    } catch (error) {
      return this.handleError(error, 'writeConfig');
    }
  }

  async writeConfigUpdate(
    id: number,
    updateData: any,
    token: string,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.adminServiceUrl}/v1/admin/tcs/config/${id}/write`,
          updateData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'writeConfigUpdate');
    }
  }

  async writeConfigDelete(id: number, token: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(
          `${this.adminServiceUrl}/v1/admin/tcs/config/${id}/write`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );
    } catch (error) {
      this.handleError(error, 'writeConfigDelete');
    }
  }

  async updateConfigByStatus(
    id: number,
    status: string,
    token: string,
    comment?: string,
  ): Promise<Config | null> {
    try {
      const body: any = { status };
      if (comment !== undefined) {
        body.comments = comment;
      }
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.adminServiceUrl}/v1/admin/tcs/config/${id}/write`,
          body,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data.config;
    } catch (error) {
      return this.handleError(error, 'updateConfigByStatus');
    }
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
    try {
      const { limit = 10, offset = 0, ...filterPayload } = filters;

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/config/${offset}/${limit}`,
          filterPayload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        configs: response.data.configs ?? [],
        pagination: response.data.pagination ?? {
          total: 0,
          limit,
          offset,
          pages: 0,
        },
      };
    } catch (error) {
      return this.handleError(error, 'findConfigsByStatus');
    }
  }

  async updatePublishingStatus(
    id: number,
    publishingStatus: 'active' | 'inactive',
    token: string,
  ): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(
          `${this.adminServiceUrl}/v1/admin/tcs/config/${id}/publishing-status`,
          { publishing_status: publishingStatus },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'updatePublishingStatus');
    }
  }

  async getAllConfigsWithFilters(
    offset: number,
    limit: number,
    filters: Record<string, any>,
    token: string,
  ): Promise<Config[]> {
    return await this.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${offset}/${limit}`,
      filters,
      {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
    );
  }

  async addMapping(id: number, mappingData: any, token: string): Promise<any> {
    return await this.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/mapping`,
      mappingData,
      {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
    );
  }

  async removeMapping(id: number, index: number, token: string): Promise<any> {
    return await this.forwardRequest(
      'DELETE',
      `/v1/admin/tcs/config/${id}/mapping/${index}`,
      undefined,
      {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
    );
  }

  async addFunction(
    id: number,
    functionData: any,
    token: string,
  ): Promise<any> {
    return await this.forwardRequest(
      'POST',
      `/v1/admin/tcs/config/${id}/function`,
      functionData,
      {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
    );
  }

  async removeFunction(id: number, index: number, token: string): Promise<any> {
    return await this.forwardRequest(
      'DELETE',
      `/v1/admin/tcs/config/${id}/function/${index}`,
      undefined,
      {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
    );
  }

  async getAllCollections(tenantId: string, token: string): Promise<any> {
    this.logger.debug(
      `Token received: ${token ? `${token.substring(0, 20)}...` : 'EMPTY'}`,
    );

    try {
      const authHeader = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
      this.logger.debug(
        `Authorization header: ${authHeader.substring(0, 30)}...`,
      );
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminServiceUrl}/v1/admin/tcs/data-model/collections/${tenantId}`,
          {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'getAllCollections');
    }
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
    try {
      const authHeader = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/data-model/destination-types`,
          dto,
          {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'createDestinationType');
    }
  }

  async destinationTypeExists(
    destinationTypeId: number,
    token: string,
  ): Promise<any> {
    try {
      const authHeader = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminServiceUrl}/v1/admin/tcs/data-model/destination-types/${destinationTypeId}/exists`,
          {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'destinationTypeExists');
    }
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
    try {
      const authHeader = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/data-model/destination-types/${destinationTypeId}/fields`,
          dto,
          {
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'addFieldToDestinationType');
    }
  }

  async createTransactionTypeTable(
    transactionType: string,
    token: string,
  ): Promise<void> {
    return await this.forwardRequest(
      'POST',
      '/v1/admin/tcs/deploy/transaction-type-table',
      { transactionType },
      {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
    );
  }

  async createTazamaDataModelTable(
    tableName: string,
    token: string,
  ): Promise<void> {
    return await this.forwardRequest(
      'POST',
      '/v1/admin/tcs/data-model/table',
      { tableName },
      {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
    );
  }

  private handleError(error: any, operation: string): any {
    if (error.response) {
      const { status, data } = error.response;
      this.logger.error(
        `${operation} failed with status ${status}: ${JSON.stringify(data)}`,
      );

      throw new HttpException(
        data?.message ?? 'Admin service returned an error response',
        status ?? HttpStatus.BAD_GATEWAY,
      );
    } else if (error.request) {
      this.logger.error(
        `${operation} - No response from admin-service: ${error.message}`,
      );
      throw new HttpException(
        'Admin service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else {
      this.logger.error(`${operation} - Error: ${error.message}`);
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
