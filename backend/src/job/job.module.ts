import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { LoggerModule } from 'src/logger-service/logger-service.module';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  providers: [JobService],
  controllers: [JobController],
  imports: [LoggerModule, DatabaseModule, AuditModule]
})
export class JobModule { }
