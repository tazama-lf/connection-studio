import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { SimulationController } from './simulation.controller';
import { ConfigModule } from '../config/config.module';
import { SchemaValidationModule } from '../schemaValidation/schema-validation.module';

@Module({
  imports: [ConfigModule, SchemaValidationModule],
  providers: [SimulationService],
  controllers: [SimulationController],
  exports: [SimulationService],
})
export class SimulationModule {}
