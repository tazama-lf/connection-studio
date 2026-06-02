import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ISuccess } from '@tazama-lf/tcs-lib';
import { executeHttpRequest } from 'src/utils/api-helper';

@Injectable()
export class DeApiClient {
  private readonly logger = new Logger(DeApiClient.name);
  private readonly deApiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.deApiUrl = this.configService.get<string>('DEAPI_URL') ?? '';
    if (!this.deApiUrl) {
      this.logger.error('DEAPI_URL is not configured');
      throw new Error('DEAPI_URL configuration is required');
    }
  }

  async notifyJob(id: string, token: string, type: string): Promise<ISuccess> {
    const params = new URLSearchParams({ type });
    return await executeHttpRequest(
      this.httpService,
      'POST',
      this.deApiUrl,
      `/job-notify/${id}?${params.toString()}`,
      token,
    );
  }
}
