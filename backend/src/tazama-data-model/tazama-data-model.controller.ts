import { Controller, Get } from '@nestjs/common';
import { TazamaDataModelService } from './tazama-data-model.service';

@Controller('tazama-data-model')
export class TazamaDataModelController {
  constructor(
    private readonly tazamaDataModelService: TazamaDataModelService,
  ) {}

  @Get('destination-options')
  getDestinationOptions() {
    return {
      success: true,
      data: this.tazamaDataModelService.getDestinationOptions(),
    };
  }
}
