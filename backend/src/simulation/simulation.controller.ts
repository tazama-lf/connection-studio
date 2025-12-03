import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import type { SimulationResult } from './simulation.service';
import { SimulatePayloadDto, PayloadType } from './dto/simulate-payload.dto';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { RequireAnyClaims, TazamaClaims } from '../auth/auth.decorator';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('simulation')
@UseGuards(TazamaAuthGuard)
@RequireAnyClaims(TazamaClaims.EDITOR, TazamaClaims.APPROVER)
export class SimulationController {
  private readonly logger = new Logger(SimulationController.name);

  constructor(private readonly simulationService: SimulationService) {}

  @Post('run')
  async simulateMapping(
    @Body() dto: SimulatePayloadDto,
    @User() user?: AuthenticatedUser,
  ): Promise<SimulationResult> {
    const serviceDto = {
      endpointId: dto.configId,
      payload: dto.testPayload,
      payloadType:
        dto.payloadType === PayloadType.JSON
          ? 'application/json'
          : 'application/xml',
      tcsMapping: dto.tcsMapping,
    } as const;

    this.logger.log(
      `TCS simulation requested for endpoint ${serviceDto.endpointId}`,
    );

    if (!user?.token) {
      throw new Error('User authentication required');
    }

    const { token } = user;
    const { sub: userId, tenantId } = token;

    if (!tenantId) {
      throw new Error('Tenant ID not found in user context');
    }

    const result = await this.simulationService.simulateMapping(
      serviceDto,
      tenantId,
      userId,
      user.token.tokenString,
    );

    this.logger.log(
      `TCS simulation completed with status: ${result.status}, errors: ${result.errors.length}`,
    );

    return result;
  }
}
