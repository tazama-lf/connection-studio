import { Module } from '@nestjs/common';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { ConfigModule } from '../config/config.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { DataModelExtensionModule } from '../data-model-extensions/data-model-extension.module';

@Module({
  imports: [
    ConfigModule, // Provides ConfigRepository and PayloadParsingService
    AuthModule, // Provides authentication guards
    AuditModule, // Provides audit logging functionality
    DataModelExtensionModule, // Provides TazamaDataModelService
  ],
  controllers: [SimulationController],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
