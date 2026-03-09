import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { SimulationController } from './simulation.controller';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [SimulationService],
  controllers: [SimulationController],
  exports: [SimulationService],
})
export class SimulationModule {}
