import { HttpService } from '@nestjs/axios';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import {
  StartupFactory,
  type IStartupService,
} from '@tazama-lf/frms-coe-startup-lib';
import { ConfigType } from '@tazama-lf/tcs-lib';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotifyService implements OnModuleInit {
  private readonly natsService: IStartupService;
  private readonly ackService: IStartupService;
  private consumerStream: string;
  private producerStream: string;

  /* c8 ignore start */
  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    /* c8 ignore stop */
    this.natsService = new StartupFactory();
    this.ackService = new StartupFactory();
  }

  async onModuleInit(): Promise<void> {
    try {
      this.consumerStream = this.configService.get<string>(
        'CONSUMER_STREAM',
        'config.notification.response',
      );
      this.producerStream = this.configService.get<string>(
        'PRODUCER_STREAM',
        'config.notification',
      );

      this.logger.log(
        `Consumer Stream: ${this.consumerStream}`,
        'NotifyService',
      );
      this.logger.log(
        `Producer Stream: ${this.producerStream}`,
        'NotifyService',
      );

      await this.natsService.initProducer(this.logger, this.producerStream);
      this.logger.log(
        'NATS producer initialized - sending to config.notification',
        'NotificationController',
      );

      await this.ackService.init(
        this.handleAckMessage.bind(this),
        this.logger,
        [this.consumerStream],
        'tcs.ack.response',
      );
      this.logger.log(
        'ACK receiver initialized - listening on config.notification.response',
        'NotificationController',
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        new Error(`Failed to initialize: ${errorMessage}`),
        'NotificationController',
      );
      throw error;
    }
  }

  private async handleAckMessage(
    reqObj: unknown,
    handleResponse: (response: object) => Promise<void>,
  ): Promise<void> {
    this.logger.log(
      `ACK from Data-Enrichment: ${JSON.stringify(reqObj)}`,
      'NotificationController',
    );

    await handleResponse({
      status: 'ACK_RECEIVED',
      timestamp: new Date().toISOString(),
    });
  }

  async notifyEnrichment(id: string, type: ConfigType): Promise<void> {
    try {
      const payload = {
        dataPayload: JSON.stringify({ endpointId: id, configType: type }),
      };

      await this.natsService.handleResponse(payload);

      this.logger.log(
        `Configuration with endpoint_id : ${id} and config_type : ${type} sent to DATA-ENRICHMENT`,
      );
    } catch (error) {
      this.logger.error(
        new Error(
          `Failed to process notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
        'NotificationController',
      );
    }
  }

  async notifyDems(
    configId: string,
    _tenantId: string,
    publishingStatus: 'active' | 'inactive',
  ): Promise<void> {
    const adminServiceUrl =
      this.configService.get<string>('ADMIN_SERVICE_URL') ?? '';
    const url = `${adminServiceUrl}/config-notify/${configId}`;

    try {
      this.logger.log(
        `Sending HTTP notification to DEMS: POST ${url}`,
        'NotifyService',
      );

      await firstValueFrom(
        this.httpService.post(url, { publishing_status: publishingStatus }),
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
