import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TazamaDataModelService } from './tazama-data-model.service';
import { TazamaDataModelController } from './tazama-data-model.controller';
import { TazamaDataModelRepository } from './tazama-data-model.repository';
import { DatabaseModule } from '../database/database.module';
import { AdminServiceClient } from '../services/admin-service-client.service';

@Module({
  imports: [DatabaseModule, HttpModule],
  controllers: [TazamaDataModelController],
  providers: [TazamaDataModelRepository, TazamaDataModelService, AdminServiceClient],
  exports: [TazamaDataModelService, TazamaDataModelRepository],
})
export class TazamaDataModelModule {}
