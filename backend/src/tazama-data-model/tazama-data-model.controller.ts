import { Controller, Get } from '@nestjs/common';
import { TazamaDataModelService } from './tazama-data-model.service';
import { TazamaDataModelRepository } from './tazama-data-model.repository';
import { DatabaseService } from '../database/database.service';

@Controller('tazama-data-model')
export class TazamaDataModelController {
  constructor(
    private readonly tazamaDataModelService: TazamaDataModelService,
    private readonly tazamaRepository: TazamaDataModelRepository,
    private readonly databaseService: DatabaseService,
  ) {}
  
  @Get('destination-options')
  async getDestinationOptions() {
    try {
      const data = await this.tazamaDataModelService.getDestinationOptions();
      return {
        success: true,
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }
}
