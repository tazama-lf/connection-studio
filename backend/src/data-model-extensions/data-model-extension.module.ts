import { Module } from '@nestjs/common';
import { DataModelExtensionService } from './data-model-extension.service';
import { DataModelExtensionController } from './data-model-extension.controller';
import { DataModelExtensionRepository } from './data-model-extension.repository';
@Module({
  controllers: [DataModelExtensionController],
  providers: [DataModelExtensionService, DataModelExtensionRepository],
  exports: [DataModelExtensionService],
})
export class DataModelExtensionModule {}
