import { Module } from '@nestjs/common';
import { TazamaDataModelService } from './tazama-data-model.service';

@Module({
  providers: [TazamaDataModelService],
  exports: [TazamaDataModelService],
})
export class TazamaDataModelModule {}
