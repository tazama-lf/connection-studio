import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { SchemasModule } from '../schemas/schemas.module';
import { AuditModule } from '../audit/audit.module';
import { PayloadParsingService, FileParsingService } from '@tazama-lf/tcs-lib';
import { DataModelExtensionModule } from '../data-model-extensions/data-model-extension.module';
@Module({
  imports: [SchemasModule, AuditModule, DataModelExtensionModule],
  controllers: [ConfigController],
  providers: [
    ConfigService,
    ConfigRepository,
    PayloadParsingService,
    FileParsingService,
  ],
  exports: [ConfigService, ConfigRepository, PayloadParsingService],
})
export class ConfigModule {}
