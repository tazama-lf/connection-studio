import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { LoggerModule } from '../logger-service/logger-service.module';
import { DatabaseModule } from 'src/database/database.module';
import { SftpModule } from 'src/sftp/sftp.module';

@Module({
  imports: [LoggerModule, DatabaseModule, SftpModule],
  providers: [SchedulerService],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
