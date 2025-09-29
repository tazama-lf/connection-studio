import { Module } from '@nestjs/common';
import { EndpointsController } from './endpoints.controller';
import { EndpointsService } from './endpoints.service';
import { EndpointsRepository } from './endpoints.repository';
import { FileParsingService } from '../common/file-parsing.service';
import { SchemasModule } from '../schemas/schemas.module';
import { AuditModule } from '../audit/audit.module';
//hello

@Module({
  imports: [SchemasModule, AuditModule],
  controllers: [EndpointsController],
  providers: [EndpointsService, EndpointsRepository, FileParsingService],
  exports: [EndpointsService],
})
export class EndpointsModule {}
