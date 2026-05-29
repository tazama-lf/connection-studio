import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { ConfigType } from '@tazama-lf/tcs-lib';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotifyService {
  /* c8 ignore start */
  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}
  /* c8 ignore stop */

  async notifyEnrichment(
    id: string,
    type: ConfigType,
    token: string,
  ): Promise<void> {
    const deapiUrl = this.configService.get<string>('DEAPI_URL') ?? '';
    const url = `${deapiUrl}/job-notify/${id}?type=${type}`;
    const headers = {
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    };

    try {
      this.logger.log(
        `Sending HTTP notification to DEAPI: POST ${url}`,
        'NotifyService',
      );

      await firstValueFrom(this.httpService.post(url, null, { headers }));

      this.logger.log(
        `Enrichment notification (ID: ${id}) sent to ${url}`,
        'NotifyService',
      );
    } catch (error) {
      this.logger.error(
        new Error(
          `Failed to send DEAPI notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
        'NotifyService',
      );
    }
  }

  async notifyDems(
    configId: string,
    _tenantId: string,
    publishingStatus: 'active' | 'inactive',
  ): Promise<void> {
    const demsUrl =
      this.configService.get<string>('DEMS_URL') ?? '';
    const url = `${demsUrl}/config-notify/${configId}`;

    try {
      this.logger.log(
        `Sending HTTP notification to DEMS: PATCH ${url}`,
        'NotifyService',
      );

      await firstValueFrom(
        this.httpService.patch(url, { publishing_status: publishingStatus }),
      );

      this.logger.log(
        `Config activation notification (ID: ${configId}) sent to ${url}`,
        'NotifyService',
      );
    } catch (error) {
      this.logger.error(
        new Error(
          `Failed to send DEMS notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
        'NotifyService',
      );
    }
  }
}
