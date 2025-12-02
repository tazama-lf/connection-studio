import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { TazamaDataModelService } from './tazama-data-model.service';
import { TazamaDataModelRepository } from './tazama-data-model.repository';
import { DatabaseService } from '../database/database.service';
import type { CreateDestinationTypeDto, CreateFieldDto, DestinationTypeResponse, FieldResponse } from './tazama-data-model.dto';
import { TazamaDestinationPath, TazamaFieldType } from './tazama-data-model.interfaces';

interface DestinationOption {
  value: TazamaDestinationPath;
  label: string;
  collection: string;
  field: string;
  type: TazamaFieldType;
  required: boolean;
  properties?: unknown[];
}

@Controller('tazama-data-model')
export class TazamaDataModelController {
  constructor(
    private readonly tazamaDataModelService: TazamaDataModelService,
    private readonly tazamaRepository: TazamaDataModelRepository,
    private readonly databaseService: DatabaseService,
  ) {}
  @Get('destination-options')
  async getDestinationOptions(): Promise<{ success: boolean; data: DestinationOption[]; error?: string }> {
    try {
      const data = await this.tazamaDataModelService.getDestinationOptions();
      return {
        success: true,
        data,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        data: [],
      };
    }
  }

  /**
   * Create a new destination type (collection)
   */
  @Post('destination-types')
  async createDestinationType(@Body() dto: CreateDestinationTypeDto): Promise<{ 
    success: boolean; 
    message: string; 
    data: DestinationTypeResponse | null 
  }> {
    try {
      const data = await this.tazamaDataModelService.createDestinationType(dto);
      return {
        success: true,
        message: 'Destination type created successfully',
        data,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
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
  ): Promise<{ success: boolean; message: string; data: FieldResponse | null }> {
    try {
      const data = await this.tazamaDataModelService.addFieldToDestinationType(destinationTypeId, dto);
      return {
        success: true,
        message: 'Field added successfully',
        data,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  }
}
