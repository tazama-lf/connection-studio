import { Module } from '@nestjs/common';
import { TazamaDataModelService } from './tazama-data-model.service';
import { TazamaDataModelController } from './tazama-data-model.controller';

@Module({
  controllers: [TazamaDataModelController],
  providers: [TazamaDataModelService],
  exports: [TazamaDataModelService],
})
export class TazamaDataModelModule {}
