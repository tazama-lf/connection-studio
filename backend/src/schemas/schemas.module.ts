import { Module } from '@nestjs/common';
import { SchemaInferenceService } from './schema-inference.service';

@Module({
  providers: [SchemaInferenceService],
  exports: [SchemaInferenceService],
})
export class SchemasModule {}
