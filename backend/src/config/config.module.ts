import { Module, forwardRef } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { SchemasModule } from '../schemas/schemas.module';
import { AuditModule } from '../audit/audit.module';
import { PayloadParsingService, FileParsingService } from '@tazama-lf/tcs-lib';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import { AuditService } from '../audit/audit.service';
import { DataModelExtensionModule } from '../data-model-extensions/data-model-extension.module';
import { FlowableModule } from '../flowable/flowable.module';

@Module({
  imports: [
    SchemasModule,
    AuditModule,
    DataModelExtensionModule,
    forwardRef(() => FlowableModule),
  ],
  controllers: [ConfigController],
  providers: [
    ConfigService,
    ConfigRepository,
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
