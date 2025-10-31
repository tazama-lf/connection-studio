import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { ConfigWorkflowService } from './config-workflow.service';
import { SchemasModule } from '../schemas/schemas.module';
import { AuditModule } from '../audit/audit.module';
import { TazamaDataModelModule } from '../tazama-data-model/tazama-data-model.module';
import { SftpModule } from '../sftp/sftp.module';

@Module({
  imports: [SchemasModule, AuditModule, TazamaDataModelModule, SftpModule],
  controllers: [ConfigController],
  providers: [ConfigService, ConfigRepository, ConfigWorkflowService],
  exports: [ConfigService, ConfigRepository],
})
export class ConfigModule {}
