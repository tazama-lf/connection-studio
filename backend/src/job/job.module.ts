import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { LoggerModule } from '../logger-service/logger-service.module';
import { DatabaseModule } from '../database/database.module';
import { DryRunModule } from '../dry-run/dry-run.module';
import { ConfigModule } from '@nestjs/config';
import { SftpModule } from 'src/sftp/sftp.module';
import { NotifyModule } from 'src/notify/notify.module';
import { AdminServiceClient } from 'src/services/admin-service-client.service';
import { HttpModule } from '@nestjs/axios';
import { SchedulerModule } from 'src/scheduler/scheduler.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  providers: [JobService, AdminServiceClient],
  controllers: [JobController],
  imports: [
    LoggerModule,
    DatabaseModule,
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
