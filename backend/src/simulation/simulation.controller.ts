import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import type {
  SimulatePayloadDto,
  SimulationResult,
} from './simulation.service';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { RequireAnyClaims, TazamaClaims } from '../auth/auth.decorator';
import { User } from '../auth/user.decorator';

@Controller('simulation')
@UseGuards(TazamaAuthGuard)
@RequireAnyClaims(TazamaClaims.EDITOR, TazamaClaims.APPROVER)
export class SimulationController {
  private readonly logger = new Logger(SimulationController.name);

  constructor(private readonly simulationService: SimulationService) {}

  @Post('run')
  async simulateMapping(
    @Body() body: any,
    @User() user?: any,
  ): Promise<SimulationResult> {
    this.logger.log(`DEBUG - Full body received: ${JSON.stringify(body)}`);

    // Map frontend field names to backend DTO
    const dto: SimulatePayloadDto = {
      endpointId: body.configId || body.endpointId,
      payload: body.testPayload || body.payload,
      payloadType: body.payloadType,
      tcsMapping: body.tcsMapping,
    };

    this.logger.log(`DEBUG - Mapped DTO: ${JSON.stringify(dto)}`);
    this.logger.log(
      `TCS simulation requested for endpoint ${dto.endpointId} by user ${user?.id || 'unknown'}`,
    );

    const userId = user?.id || user?.sub;
    const tenantId =
      user?.tenantId ||
      user?.tenant_id ||
      user?.realm ||
      user?.organization ||
      user?.org ||
      user?.org_id;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user context');
    }

    const result = await this.simulationService.simulateMapping(
      dto,
      tenantId,
      userId,
      user?.token?.tokenString,
    );

    this.logger.log(
      `TCS simulation completed with status: ${result.status}, errors: ${result.errors.length}`,
    );

    return result;
  }
}
