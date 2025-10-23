import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { LoggerModule } from '../logger-service/logger-service.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [LoggerModule, DatabaseModule],
  providers: [SchedulerService],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
