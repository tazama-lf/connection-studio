import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { LoggerModule } from '../logger-service/logger-service.module';

@Module({
  imports: [LoggerModule],
  providers: [SchedulerService,],
  controllers: [SchedulerController]
})
export class SchedulerModule { }
