import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { executeHttpRequest } from '../utils/api-helper';

@Injectable()
export class DemsClient {
  /* c8 ignore start */
  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const demsUrl = this.configService.get<string>('DEMS_URL');
    if (!demsUrl) {
      this.logger.warn(
        'DEMS_URL is not configured. DEMS notifications will not be sent.',
        'DemsClient',
      );
      throw new Error('DEMS_URL configuration is missing');
    }
  }
  /* c8 ignore stop */

  async notifyDems(
    configId: string,
    _tenantId: string,
    publishingStatus: 'active' | 'inactive',
  ): Promise<void> {
    const demsUrl = this.configService.get<string>('DEMS_URL')!;

    this.logger.log(
      `Sending HTTP notification to DEMS: PATCH ${demsUrl}/config-notify/${configId}`,
      'DemsClient',
    );

    await executeHttpRequest(
      this.httpService,
      'PATCH',
      demsUrl,
      `/config-notify/${configId}`,
      '',
      { publishing_status: publishingStatus },
    );

    this.logger.log(
      `Config activation notification (ID: ${configId}) sent to ${demsUrl}/config-notify/${configId}`,
      'DemsClient',
    );
  }
}
