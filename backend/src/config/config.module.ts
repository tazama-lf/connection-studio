import { Module, forwardRef } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { ConfigWorkflowService } from './config-workflow.service';
import { SchemasModule } from '../schemas/schemas.module';
import { AuditModule } from '../audit/audit.module';
import { PayloadParsingService, FileParsingService } from '@tazama-lf/tcs-lib';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import { AuditService } from '../audit/audit.service';
import { TazamaDataModelModule } from '../tazama-data-model/tazama-data-model.module';

@Module({
  imports: [SchemasModule, AuditModule, TazamaDataModelModule],
  controllers: [ConfigController],
  providers: [
    ConfigService,
    ConfigRepository,
    ConfigWorkflowService,
    {
      provide: PayloadParsingService,
      useFactory: (jsonSchemaConverter: JSONSchemaConverterService) => {
        return new PayloadParsingService(jsonSchemaConverter);
      },
      inject: [JSONSchemaConverterService],
    },
    {
      provide: FileParsingService,
      useFactory: (auditService: AuditService) => {
        return new FileParsingService(auditService);
      },
      inject: [AuditService],
    },
  ],
  exports: [ConfigService, ConfigRepository, PayloadParsingService],
})
export class ConfigModule {}
