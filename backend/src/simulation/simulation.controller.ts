import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import type {
  SimulatePayloadDto,
  SimulationResult,
} from './simulation.service';
import { TazamaAuthGuard } from '../auth/tazama-auth.guard';
import { RequireEditorRole } from '../auth/auth.decorator';
import { User } from '../auth/user.decorator';
@Controller('simulation')
@UseGuards(TazamaAuthGuard)
@RequireEditorRole()
export class SimulationController {
  private readonly logger = new Logger(SimulationController.name);
  constructor(private readonly simulationService: SimulationService) {}
  /**
   * POST /simulation/run
   *
   * Perform a dry-run simulation of message transformation
   *
   * @param dto - Simulation request with endpoint ID, tenant, and payload
   * @param user - Authenticated user from token
   * @returns Simulation result with validation status and transformed payload
   *
   * @example
   * POST /simulation/run
   * {
   *   "endpointId": 1,
   *   "tenantId": "ACM102",
   *   "payloadType": "JSON",
   *   "payload": {
   *     "transactionId": "T001",
   *     "amount": 1000,
   *     "currency": "USD",
   *     "firstName": "John",
   *     "lastName": "Doe"
   *   }
   * }
   */
  @Post('run')
  async simulateMapping(
    @Body() dto: SimulatePayloadDto,
    @User() user?: any,
  ): Promise<SimulationResult> {
    this.logger.log(
      `Simulation requested for endpoint ${dto.endpointId} by user ${user?.id || 'unknown'}`,
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
    );
    this.logger.log(
      `Simulation completed with status: ${result.status}, errors: ${result.errors.length}`,
    );
    return result;
  }
  /**
   * POST /simulation/validate
   *
   * Validate payload against schema only (no mapping execution)
   * Useful for quick schema validation checks
   */
  @Post('validate')
  async validatePayload(
    @Body() dto: SimulatePayloadDto,
    @User() user?: any,
  ): Promise<{ valid: boolean; errors: any[] }> {
    this.logger.log(`Validation requested for endpoint ${dto.endpointId}`);
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
    );
    return {
      valid: result.summary.validationSteps.schemaValidation === 'PASSED',
      errors: result.errors.filter(
        (e) => e.field !== 'mapping' && e.field !== 'tazama',
      ),
    };
  }
}
