import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@tazama-lf/frms-coe-lib';
import {
    StartupFactory,
    type IStartupService,
} from '@tazama-lf/frms-coe-startup-lib';
import { ConfigType } from '@tazama-lf/tcs-lib';

@Injectable()
export class NotifyService {
    private readonly natsService: IStartupService;
    private readonly ackService: IStartupService;
    private readonly consumerStream: string;
    private readonly producerStream: string;

    constructor(
        private readonly logger: LoggerService,
        private readonly configService: ConfigService
    ) {
        this.natsService = new StartupFactory();
        this.ackService = new StartupFactory();
        this.consumerStream = this.configService.get<string>('CONSUMER_STREAM', 'config.notification');
        this.producerStream = this.configService.get<string>('PRODUCER_STREAM', 'config.notification.response');
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.natsService.initProducer(this.logger, this.consumerStream);
            this.logger.log(`NATS producer initialized - sending to ${this.consumerStream}`, 'NotificationController');

            await this.ackService.init(
                this.handleAckMessage.bind(this) as never,
                this.logger,
                [this.producerStream],
                'tcs.ack.response'
            );
            this.logger.log(`ACK receiver initialized - listening on ${this.producerStream}`, 'NotificationController');
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

    private async handleAckMessage(reqObj: unknown, handleResponse: (response: object) => Promise<void>): Promise<void> {
        this.logger.log(`ACK from Data-Enrichment: ${JSON.stringify(reqObj)}`, 'NotificationController');

        await handleResponse({
            status: 'ACK_RECEIVED',
            timestamp: new Date().toISOString()
        });
    }

    async notifyEnrichment(id: string, type: ConfigType): Promise<void> {
        try {
            await this.natsService.handleResponse({ TxTp: id, tenant_id: type }, ['config.enrichment']);


            this.logger.log(
                `Configuration (ID: ${id}) sent to DATA-ENRICHMENT`,
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

}
