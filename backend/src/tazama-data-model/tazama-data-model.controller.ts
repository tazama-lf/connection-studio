import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { TazamaDataModelService } from './tazama-data-model.service';
import { TazamaDataModelRepository } from './tazama-data-model.repository';
import { DatabaseService } from '../database/database.service';
import type { CreateDestinationTypeDto, CreateFieldDto } from './tazama-data-model.dto';

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

  /**
   * Create a new destination type (collection)
   */
  @Post('destination-types')
  async createDestinationType(@Body() dto: CreateDestinationTypeDto) {
    try {
      const data = await this.tazamaDataModelService.createDestinationType(dto);
      return {
        success: true,
        message: 'Destination type created successfully',
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  /**
   * Add a field to a destination type
   */
  @Post('destination-types/:destinationTypeId/fields')
  async addFieldToDestinationType(
    @Param('destinationTypeId', ParseIntPipe) destinationTypeId: number,
    @Body() dto: CreateFieldDto,
  ) {
    try {
      const data = await this.tazamaDataModelService.addFieldToDestinationType(destinationTypeId, dto);
      return {
        success: true,
        message: 'Field added successfully',
        data: data,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

}
