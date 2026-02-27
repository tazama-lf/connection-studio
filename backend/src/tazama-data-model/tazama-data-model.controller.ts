import {
  Controller,
  Get,
  Put,
  Body,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { RequireAnyClaims, TazamaClaims } from '../auth/auth.decorator';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

import { TazamaDataModelService } from './tazama-data-model.service';
import { Audit } from 'src/decorators/audit.decorator';


@Controller('tazama-data-model')
@UseGuards(TazamaAuthGuard)
export class TazamaDataModelController {
  private readonly logger = new Logger(TazamaDataModelController.name);

  constructor(
    private readonly tazamaDataModelService: TazamaDataModelService,
  ) { }
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
  @Audit()
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
