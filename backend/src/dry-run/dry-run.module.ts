import { Module } from '@nestjs/common';
import { DryRunService } from './dry-run.service';
import { HttpModule } from '@nestjs/axios';
import { LoggerModule } from 'src/logger-service/logger-service.module';

@Module({
  providers: [DryRunService],
  imports: [HttpModule, LoggerModule],
  exports: [DryRunService],
})
export class DryRunModule {}
