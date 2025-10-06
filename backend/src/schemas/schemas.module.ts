import { Module } from '@nestjs/common';
import { SchemaInferenceService } from './schema-inference.service';
import { JSONSchemaConverterService } from './json-schema-converter.service';

@Module({
  providers: [SchemaInferenceService, JSONSchemaConverterService],
  exports: [SchemaInferenceService, JSONSchemaConverterService],
})
export class SchemasModule {}
