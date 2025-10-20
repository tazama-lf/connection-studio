import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { LoggerModule } from '../logger-service/logger-service.module';
import { DatabaseModule } from '../database/database.module';
import { AuditModule } from '../audit/audit.module';
import { DryRunModule } from '../dry-run/dry-run.module';

@Module({
  providers: [JobService],
  controllers: [JobController],
  imports: [LoggerModule, DatabaseModule, AuditModule, DryRunModule]
})
export class JobModule { }
