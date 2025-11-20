import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { LoggerModule } from '../logger-service/logger-service.module';
import { DatabaseModule } from 'src/database/database.module';
import { SftpModule } from 'src/sftp/sftp.module';
import { AdminServiceClient } from 'src/services/admin-service-client.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [LoggerModule, DatabaseModule, SftpModule, HttpModule],
  providers: [SchedulerService, AdminServiceClient, ConfigService],
  controllers: [SchedulerController],
  exports: [AdminServiceClient, SchedulerService],
})
export class SchedulerModule { }
