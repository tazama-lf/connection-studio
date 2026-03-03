import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import type { SimulationResult } from './dto/simulation.dto';
import { SimulatePayloadDto, PayloadType } from './dto/simulate-payload.dto';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { RequireAnyClaims, TazamaClaims } from '../auth/auth.decorator';
import { User } from '../auth/user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Audit } from 'src/decorators/audit.decorator';

@Controller('simulation')
@UseGuards(TazamaAuthGuard)
@RequireAnyClaims(TazamaClaims.EDITOR, TazamaClaims.APPROVER)
export class SimulationController {
  private readonly logger = new Logger(SimulationController.name);

  constructor(private readonly simulationService: SimulationService) {}

  @Post('run')
  @Audit()
  async simulateMapping(
    @Body() dto: SimulatePayloadDto,
    @User() user: AuthenticatedUser,
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

    const result = await this.simulationService.simulateMapping(
      serviceDto,
      user.tenantId,
      user.userId,
      user.token.tokenString,
    );

    return result;
  }
}
