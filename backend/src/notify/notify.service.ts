import { Injectable } from '@nestjs/common';
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

    constructor(
        private readonly logger: LoggerService,
    ) {
        this.natsService = new StartupFactory();
        this.ackService = new StartupFactory();
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.natsService.initProducer(this.logger, 'config.notification');
            this.logger.log('NATS producer initialized - sending to config.notification', 'NotificationController');

            await this.ackService.init(
                this.handleAckMessage.bind(this) as never,
                this.logger,
                ['config.notification.response'],
                'tcs.ack.response'
            );
            this.logger.log('ACK receiver initialized - listening on config.notification.response', 'NotificationController');
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
            await this.natsService.handleResponse({ TxTp: id });

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
