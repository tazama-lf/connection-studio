import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DeApiClient {
  private readonly logger = new Logger(DeApiClient.name);
  private readonly deApiUrl: string | undefined;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.deApiUrl = this.configService.get<string>('DEAPI_URL');
    if (!this.deApiUrl) {
      this.logger.error('DEAPI_URL is not configured');
      throw new Error('DEAPI_URL configuration is required');
    }
  }

  private getAuthHeaders(token: string): Record<string, string> {
    return {
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    };
  }

  private async executeHttpRequest<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    token: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.deApiUrl}${path}`;
    const headers = this.getAuthHeaders(token);

    this.logger.log(`Making ${method} request to: ${url}`);

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
          : 'DEAPI service returned an error response';
      throw new HttpException(message, HttpStatus.BAD_GATEWAY);
    } else if (err.request) {
      this.logger.error(
        `${operation} - No response from DEAPI service: ${err.message}`,
      );
      throw new HttpException(
        'DEAPI service is unavailable',
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

  async notifyJob(id: string, token: string, type: string): Promise<unknown> {
    const params = new URLSearchParams({ type });
    return await this.executeHttpRequest(
      'POST',
      `/job-notify/${id}?${params.toString()}`,
      token,
    );
  }
}
