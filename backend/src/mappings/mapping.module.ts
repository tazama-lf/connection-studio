import { Module } from '@nestjs/common';
import { TazamaDataModelService } from './tazama-data-model.service';
import { DestinationFieldExtensionsRepository } from './destination-field-extensions.repository';
// Multi-field mapping components
import { MultiFieldMappingService } from './multi-field-mapping.service';
import { MultiFieldMappingsRepository } from './multi-field-mappings.repository';
import { MultiFieldMappingController } from './multi-field-mapping.controller';
import { EndpointsModule } from '../endpoints/endpoints.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [EndpointsModule, AuditModule],
  controllers: [MultiFieldMappingController],
  providers: [
    TazamaDataModelService,
    DestinationFieldExtensionsRepository,
    // Multi-field mapping services
    MultiFieldMappingService,
    MultiFieldMappingsRepository,
  ],
  exports: [
    TazamaDataModelService,
    DestinationFieldExtensionsRepository,
    // Multi-field mapping services
    MultiFieldMappingService,
    MultiFieldMappingsRepository,
  ],
})
export class MappingModule {}
