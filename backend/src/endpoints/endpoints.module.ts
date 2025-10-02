import { Module } from '@nestjs/common';
import { EndpointsController } from './endpoints.controller';
import { EndpointsService } from './endpoints.service';
import { EndpointsRepository } from './endpoints.repository';
import { PayloadParsingService } from './payload-parsing.service';
import { FileParsingService } from '../common/file-parsing.service';
import { SchemasModule } from '../schemas/schemas.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [SchemasModule, AuditModule],
  controllers: [EndpointsController],
  providers: [
    EndpointsService,
    EndpointsRepository,
    FileParsingService,
    PayloadParsingService,
  ],
  exports: [EndpointsService, EndpointsRepository, PayloadParsingService],
})
export class EndpointsModule {}
