import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AdminServiceClient {
  private readonly logger = new Logger(AdminServiceClient.name);
  private readonly adminServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.adminServiceUrl =
      this.configService.get<string>('ADMIN_SERVICE_URL') ||
      'http://localhost:3100';
    this.logger.log(
      `AdminServiceClient initialized with URL: ${this.adminServiceUrl}`,
    );
  }

  /**
   *
   * @param method - HTTP method (GET, POST, PUT, DELETE, PATCH)
   * @param path - API path (e.g., '/v1/admin/tcs/config/123')
   * @param body - Request body (for POST, PUT, PATCH)
   * @param headers - Additional headers to include
   * @returns Response from admin-service
   */
  async forwardRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    const url = `${this.adminServiceUrl}${path}`;

    this.logger.log(`Forwarding ${method} request to: ${url}`);
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

        default:
          throw new HttpException(
            `Unsupported HTTP method: ${String(method)}`,
            HttpStatus.BAD_REQUEST,
          );
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

        throw new HttpException(
          data.message || data || 'Request failed',
          status,
        );
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

  async validateConfigCreation(
    msgFam: string,
    transactionType: string,
    version: string,
    token: string,
  ): Promise<{ success: boolean; message?: string; validated?: boolean }> {
    this.logger.log(
      `Validating config creation: ${msgFam}/${version}/${transactionType}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/config`,
          { msgFam, transactionType, version },
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
      return this.handleError(error, 'validateConfigCreation');
    }
  }

  async validateConfigUpdate(
    id: number,
    updates: { msgFam?: string; transactionType?: string; version?: string },
    token: string,
  ): Promise<{
    success: boolean;
    message?: string;
    validated?: boolean;
    config?: any;
  }> {
    this.logger.log(`Validating config update for ID: ${id}`);

    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.adminServiceUrl}/v1/admin/tcs/config/${id}`,
          updates,
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
      return this.handleError(error, 'validateConfigUpdate');
    }
  }
  async validateConfigClone(
    sourceConfigId: number,
    newMsgFam: string,
    newVersion: string,
    newTransactionType: string,
    token: string,
  ): Promise<{
    success: boolean;
    message?: string;
    validated?: boolean;
    sourceConfig?: any;
  }> {
    this.logger.log(
      `Validating config clone from ID: ${sourceConfigId} to ${newMsgFam}/${newVersion}/${newTransactionType}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/config/clone`,
          { sourceConfigId, newMsgFam, newVersion, newTransactionType },
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
      return this.handleError(error, 'validateConfigClone');
    }
  }

  async validateConfigDeletion(
    id: number,
    token: string,
  ): Promise<{
    success: boolean;
    message?: string;
    validated?: boolean;
    config?: any;
  }> {
    this.logger.log(`Validating config deletion for ID: ${id}`);

    try {
      const response = await firstValueFrom(
        this.httpService.delete(
          `${this.adminServiceUrl}/v1/admin/tcs/config/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      return this.handleError(error, 'validateConfigDeletion');
    }
  }

  async getConfigById(id: number, token: string): Promise<any> {
    this.logger.log(`Getting config by ID: ${id}`);

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

      return response.data.config;
    } catch (error) {
      return this.handleError(error, 'getConfigById');
    }
  }

  async getAllConfigs(token: string): Promise<any[]> {
    this.logger.log('Getting all configs');

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.adminServiceUrl}/v1/admin/tcs/config`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );

      return response.data.configs || [];
    } catch (error) {
      return this.handleError(error, 'getAllConfigs');
    }
  }

  async writeConfig(configData: any, token: string): Promise<any> {
    this.logger.log('Writing config to database');
    this.logger.log(
      `Token type: ${typeof token}, length: ${token?.length}, first 50 chars: ${token?.substring(0, 50)}`,
    );

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
    this.logger.log(`Writing config update to database for ID: ${id}`);

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

      return response.data.config;
    } catch (error) {
      return this.handleError(error, 'writeConfigUpdate');
    }
  }

  async writeConfigDelete(id: number, token: string): Promise<void> {
    this.logger.log(`Writing config deletion to database for ID: ${id}`);

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

  async getConfigByEndpoint(
    endpointPath: string,
    version: string,
    token: string,
  ): Promise<any> {
    this.logger.log(
      `Getting config by endpoint: ${endpointPath}, version: ${version}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminServiceUrl}/v1/admin/tcs/config/endpoint`,
          {
            params: { endpointPath, version },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      return response.data.config || null;
    } catch (error) {
      return this.handleError(error, 'getConfigByEndpoint');
    }
  }

  async getConfigsByTransactionType(
    transactionType: string,
    token: string,
  ): Promise<any[]> {
    this.logger.log(`Getting configs by transaction type: ${transactionType}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminServiceUrl}/v1/admin/tcs/config/transaction/${transactionType}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      return response.data.configs || [];
    } catch (error) {
      return this.handleError(error, 'getConfigsByTransactionType');
    }
  }

  async getPendingApprovals(token: string): Promise<any[]> {
    this.logger.log('Getting pending approvals');

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminServiceUrl}/v1/admin/tcs/config/pending-approvals`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      return response.data.configs || [];
    } catch (error) {
      return this.handleError(error, 'getPendingApprovals');
    }
  }

  async runRawQuery(query: string, token: string): Promise<any> {
    this.logger.log('Executing raw SQL query via admin-service');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/v1/admin/tcs/raw-query`,
          { query },
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
      return this.handleError(error, 'runRawQuery');
    }
  }

  private handleError(error: any, operation: string): any {
    if (error.response) {
      const { status, data } = error.response;
      this.logger.error(
        `${operation} failed with status ${status}: ${JSON.stringify(data)}`,
      );

      return data;
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
