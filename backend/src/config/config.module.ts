import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { ConfigWorkflowService } from './config-workflow.service';
import { SchemasModule } from '../schemas/schemas.module';
import { AuditModule } from '../audit/audit.module';
import { TazamaDataModelModule } from '../tazama-data-model/tazama-data-model.module';
import { PayloadParsingService } from '../services/payload-parsing.service';
import { FileParsingService } from '../services/file-parsing.service';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { SftpModule } from '../sftp/sftp.module';

@Module({
  imports: [
    HttpModule,
    SchemasModule,
    AuditModule,
    TazamaDataModelModule,
    SftpModule,
  ],
  controllers: [ConfigController],
  providers: [
    ConfigService,
    ConfigRepository,
    ConfigWorkflowService,
    PayloadParsingService,
    FileParsingService,
    AdminServiceClient,
  ],
  exports: [
    ConfigService,
    ConfigRepository,
    ConfigWorkflowService,
    PayloadParsingService,
    FileParsingService,
    AdminServiceClient,
  ],
})
export class ConfigModule {}
