import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from 'src/notification/notification.module';
import { NotifyModule } from 'src/notify/notify.module';
import { SchedulerModule } from 'src/scheduler/scheduler.module';
import { AdminServiceClient } from 'src/services/admin-service-client.service';
import { SftpModule } from 'src/sftp/sftp.module';
import { DryRunModule } from '../dry-run/dry-run.module';
import { LoggerModule } from '../logger-service/logger-service.module';
import { JobController } from './job.controller';
import { JobService } from './job.service';

@Module({
  providers: [JobService, AdminServiceClient],
  controllers: [JobController],
  imports: [
    LoggerModule,
    DryRunModule,
    ConfigModule,
    SftpModule,
    NotifyModule,
    HttpModule,
    SchedulerModule,
    NotificationModule,
  ],
  exports: [AdminServiceClient],
})
export class JobModule {}
