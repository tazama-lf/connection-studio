import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from 'src/notification/notification.module';
import { SchedulerModule } from 'src/scheduler/scheduler.module';
import { AdminServiceClient } from 'src/services/admin-service-client.service';
import { SftpModule } from 'src/sftp/sftp.module';
import { DryRunModule } from '../dry-run/dry-run.module';
import { LoggerModule } from '../logger-service/logger-service.module';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { DeApiClient } from 'src/services/deapi-client.service';

@Module({
  providers: [JobService, AdminServiceClient, DeApiClient],
  controllers: [JobController],
  imports: [
    LoggerModule,
    DryRunModule,
    ConfigModule,
    SftpModule,
    HttpModule,
    SchedulerModule,
    NotificationModule,
  ],
  exports: [AdminServiceClient],
})
export class JobModule {}
