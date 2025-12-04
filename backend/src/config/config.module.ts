import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { ConfigWorkflowService } from './config-workflow.service';
import { TazamaDataModelModule } from '../tazama-data-model/tazama-data-model.module';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { SftpModule } from '../sftp/sftp.module';
import { NotificationModule } from '../notification/notification.module';
import { NotifyModule } from '../notify/notify.module';

@Module({
  imports: [
    HttpModule,

    TazamaDataModelModule,
    SftpModule,
    NotificationModule,
    NotifyModule,
  ],
  controllers: [ConfigController],
  providers: [
    ConfigService,
    ConfigRepository,
    ConfigWorkflowService,
    AdminServiceClient,
  ],
  exports: [
    ConfigService,
    ConfigRepository,
    ConfigWorkflowService,
    AdminServiceClient,
  ],
})
export class ConfigModule {}
