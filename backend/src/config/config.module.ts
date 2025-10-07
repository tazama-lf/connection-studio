import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { SchemasModule } from '../schemas/schemas.module';
import { AuditModule } from '../audit/audit.module';
import { PayloadParsingService } from '../common/payload-parsing.service';
import { FileParsingService } from '../common/file-parsing.service';
import { TazamaDataModelService } from '../common/tazama-data-model.service';
import { DataModelExtensionService } from '../common/data-model-extension.service';
import { DataModelExtensionRepository } from '../common/data-model-extension.repository';
import { DataModelController } from '../common/data-model.controller';

@Module({
  imports: [SchemasModule, AuditModule],
  controllers: [ConfigController, DataModelController],
  providers: [
    ConfigService,
    ConfigRepository,
    PayloadParsingService,
    FileParsingService,
    TazamaDataModelService,
    DataModelExtensionService,
    DataModelExtensionRepository,
  ],
  exports: [
    ConfigService,
    ConfigRepository,
    TazamaDataModelService,
    DataModelExtensionService,
  ],
})
export class ConfigModule {}
