import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService, SimulatePayloadDto } from '../../src/simulation/simulation.service';
import { AdminServiceClient } from '../../src/services/admin-service-client.service';

describe('SimulationService', () => {
  let service: SimulationService;
  const adminServiceClientMock = {
    getConfigById: jest.fn(),
    forwardRequest: jest.fn(),
  } as unknown as jest.Mocked<AdminServiceClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        { provide: AdminServiceClient, useValue: adminServiceClientMock },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fail when endpointId is invalid', async () => {
    const dto: Partial<SimulatePayloadDto> = {
      // intentionally invalid endpointId
      endpointId: undefined as unknown as number,
      payloadType: 'application/json',
      payload: '{}',
    };

    const result = await service.simulateMapping(dto as any, 'tenant-1');
    expect(result.status).toBe('FAILED');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].field).toBe('endpointId');
  });
});
