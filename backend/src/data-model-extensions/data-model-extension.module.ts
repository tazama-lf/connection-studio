import { Module } from '@nestjs/common';
import { DataModelExtensionController } from './data-model-extension.controller';
import { DataModelExtensionService } from './data-model-extension.service';
import { DataModelExtensionRepository } from './data-model-extension.repository';
import { TazamaDataModelService } from './tazama-data-model.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [DataModelExtensionController],
  providers: [
    DataModelExtensionService,
    DataModelExtensionRepository,
    TazamaDataModelService,
  ],
  exports: [
    DataModelExtensionService,
    DataModelExtensionRepository,
    TazamaDataModelService,
  ],
})
export class DataModelExtensionModule {}
