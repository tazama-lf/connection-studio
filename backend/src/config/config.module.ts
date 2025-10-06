import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { SchemasModule } from '../schemas/schemas.module';
import { AuditModule } from '../audit/audit.module';
import { PayloadParsingService } from '../common/payload-parsing.service';
import { FileParsingService } from '../common/file-parsing.service';

@Module({
  imports: [SchemasModule, AuditModule],
  controllers: [ConfigController],
  providers: [
    ConfigService,
    ConfigRepository,
    PayloadParsingService,
    FileParsingService,
  ],
  exports: [ConfigService, ConfigRepository],
})
export class ConfigModule {}
