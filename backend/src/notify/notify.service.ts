import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import {
  StartupFactory,
  type IStartupService,
} from '@tazama-lf/frms-coe-startup-lib';
import { ConfigType } from '@tazama-lf/tcs-lib';

@Injectable()
export class NotifyService implements OnModuleInit {
  private readonly natsService: IStartupService;
  private readonly demsNatsService: IStartupService;
  private readonly ackService: IStartupService;
  private consumerStream: string;
  private producerStream: string;
  private demsStream: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.natsService = new StartupFactory();
    this.demsNatsService = new StartupFactory();
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
      this.demsStream = this.configService.get<string>(
        'DEMS_STREAM',
        'dems.notify',
      );

      this.logger.log(
        `Consumer Stream: ${this.consumerStream}`,
        'NotifyService',
      );
      this.logger.log(
        `Producer Stream: ${this.producerStream}`,
        'NotifyService',
      );
      this.logger.log(`DEMS Stream: ${this.demsStream}`, 'NotifyService');

      await this.natsService.initProducer(this.logger, this.producerStream);
      this.logger.log(
        'NATS producer initialized - sending to config.notification',
        'NotificationController',
      );

      await this.demsNatsService.initProducer(this.logger, this.demsStream);
      this.logger.log(
        `DEMS NATS producer initialized - sending to ${this.demsStream}`,
        'NotifyService',
      );

      await this.ackService.init(
        this.handleAckMessage.bind(this),
        this.logger,
        [this.consumerStream, this.demsStream],
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
        dataPayload: JSON.stringify({ endpoint_id: id, config_type: type }),
      };

      await this.natsService.handleResponse(payload);

      this.logger.log(`Configuration with endpoint_id : ${id} and config_type : ${type} sent to DATA-ENRICHMENT`);
    } catch (error) {
      this.logger.error(
        new Error(
          `Failed to process notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ),
        'NotificationController',
      );
    }
  }

  async notifyDems(configId: string, tenantId: string): Promise<void> {
    try {
      this.logger.log(
        `Sending notification to DEMS stream: ${this.demsStream}`,
      );

      await this.demsNatsService.handleResponse({
        transactionID: configId,
      });

      this.logger.log(
        `Config activation notification (ID: ${configId}) sent to DEMS stream ${this.demsStream}`,
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
