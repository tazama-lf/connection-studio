import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DemsClient {
  /* c8 ignore start */
  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}
  /* c8 ignore stop */

  async notifyDems(
    configId: string,
    _tenantId: string,
    publishingStatus: 'active' | 'inactive',
  ): Promise<void> {
    const demsUrl = this.configService.get<string>('DEMS_URL') ?? '';
    const url = `${demsUrl}/config-notify/${configId}`;

    try {
      this.logger.log(
        `Sending HTTP notification to DEMS: PATCH ${url}`,
        'DemsClient',
      );

      await firstValueFrom(
        this.httpService.patch(url, { publishing_status: publishingStatus }),
      );

      this.logger.log(
        `Config activation notification (ID: ${configId}) sent to ${url}`,
        'DemsClient',
      );
    } catch (error) {
      const errorMessage = new Error(
        `Failed to send DEMS notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      this.logger.error(
        errorMessage,
        'DemsClient',
      );
      throw errorMessage;
      
    }
  }
}
