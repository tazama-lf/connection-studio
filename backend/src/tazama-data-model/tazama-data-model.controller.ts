import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { RequireAnyClaims, TazamaClaims } from '../auth/auth.decorator';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

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
  field: string | null;
  type: TazamaFieldType | null;
  required: boolean;
  parent_id: number | null;
  serial_no: number;
  collection_id: number;
  properties: unknown[];
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
  async getDestinationOptions(@User() user: AuthenticatedUser): Promise<{
    success: boolean;
    data: DestinationOption[];
    error?: string;
  }> {
    try {
      const data = await this.tazamaDataModelService.getDestinationOptions(
        user.tenantId,
        user.token.tokenString,
      );
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
    @User() user: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    data: DestinationTypeResponse | null;
  }> {
    try {
      const token = user.token.tokenString;

      if (!token) {
        return {
          success: false,
          message: 'Authorization token is required',
          data: null,
        };
      }

      const data = await this.tazamaDataModelService.createDestinationType(
        dto,
        token,
      );
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
    @User() user: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    data: FieldResponse | null;
  }> {
    try {
      const token = user.token.tokenString;

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

  @Get('json')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
    TazamaClaims.EXPORTER,
  )
  async getDataModelJson(@User() user: AuthenticatedUser): Promise<{
    success: boolean;
    data: Record<string, unknown> | null;
    message?: string;
  }> {
    try {
      const data = await this.tazamaDataModelService.getDataModelJson(
        user.tenantId,
        user.token.tokenString,
      );
      return {
        success: true,
        data,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        data: null,
        message: errorMessage,
      };
    }
  }

  @Put('json')
  @RequireAnyClaims(
    TazamaClaims.EDITOR,
    TazamaClaims.APPROVER,
    TazamaClaims.PUBLISHER,
    TazamaClaims.EXPORTER,
  )
  async putDataModelJson(
    @Body() body: { data_model_json: Record<string, unknown> },
    @User() user: AuthenticatedUser,
  ): Promise<{
    success: boolean;
    message: string;
    data: { tenant_id: string; updated_at: string } | null;
  }> {
    try {
      const data = await this.tazamaDataModelService.putDataModelJson(
        user.tenantId,
        body.data_model_json,
        user.token.tokenString,
      );
      return {
        success: true,
        message: `Data model JSON saved for tenant: ${user.tenantId}`,
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
