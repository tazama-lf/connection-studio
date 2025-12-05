import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Req,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { RequireAnyClaims, TazamaClaims } from '../auth/auth.decorator';
import { TazamaDataModelService } from './tazama-data-model.service';
import type {
  CreateDestinationTypeDto,
  CreateFieldDto,
  DestinationTypeResponse,
  FieldResponse,
} from './tazama-data-model.dto';
import {
  TazamaDestinationPath,
  TazamaFieldType,
} from './tazama-data-model.interfaces';

interface DestinationOption {
  value: TazamaDestinationPath;
  label: string;
  collection: string;
  field: string;
  type: TazamaFieldType;
  required: boolean;
  parent_id: number | null;
  serial_no: number;
  collection_id: number;
  properties?: unknown[];
}

@Controller('tazama-data-model')
@UseGuards(TazamaAuthGuard)
export class TazamaDataModelController {
  private readonly logger = new Logger(TazamaDataModelController.name);
  
  constructor(
    private readonly tazamaDataModelService: TazamaDataModelService,
  ) {}
  @Get('destination-options')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
    TazamaClaims.EXPORTER,
  )
  async getDestinationOptions(@Req() request: any): Promise<{
    success: boolean;
    data: DestinationOption[];
    error?: string;
  }> {
    try {
      const authHeader = request.headers.authorization || '';
      this.logger.debug(`Received authorization header: ${authHeader ? 'present' : 'missing'}`);
      const token = authHeader.replace('Bearer ', '').trim();
      
      if (!token) {
        return {
          success: false,
          error: 'Authorization token is required',
          data: [],
        };
      }
      
      const data = await this.tazamaDataModelService.getDestinationOptions('default', token);
      return {
        success: true,
        data,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        data: [],
      };
    }
  }


  @Post('destination-types')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
    TazamaClaims.EXPORTER,
  )
  async createDestinationType(
    @Body() dto: CreateDestinationTypeDto,
    @Req() request: any,
  ): Promise<{
    success: boolean;
    message: string;
    data: DestinationTypeResponse | null;
  }> {
    try {
      const authHeader = request.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim();
      
      if (!token) {
        return {
          success: false,
          message: 'Authorization token is required',
          data: null,
        };
      }
      
      const data = await this.tazamaDataModelService.createDestinationType(dto, token);
      return {
        success: true,
        message: 'Destination type created successfully',
        data,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  }


  @Post('destination-types/:destinationTypeId/fields')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
    TazamaClaims.EXPORTER,
  )
  async addFieldToDestinationType(
    @Param('destinationTypeId', ParseIntPipe) destinationTypeId: number,
    @Body() dto: CreateFieldDto,
    @Req() request: any,
  ): Promise<{
    success: boolean;
    message: string;
    data: FieldResponse | null;
  }> {
    try {
      const authHeader = request.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '').trim();
      
      if (!token) {
        return {
          success: false,
          message: 'Authorization token is required',
          data: null,
        };
      }
      
      const data = await this.tazamaDataModelService.addFieldToDestinationType(
        destinationTypeId,
        dto,
        token,
      );
      return {
        success: true,
        message: 'Field added successfully',
        data,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: errorMessage,
        data: null,
      };
    }
  }
}