import { Module } from '@nestjs/common';
import { TazamaDataModelService } from './tazama-data-model.service';
import { TazamaDataModelController } from './tazama-data-model.controller';
import { TazamaDataModelRepository } from './tazama-data-model.repository';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TazamaDataModelController],
  providers: [TazamaDataModelRepository, TazamaDataModelService],
  exports: [TazamaDataModelService, TazamaDataModelRepository],
})
export class TazamaDataModelModule {}
