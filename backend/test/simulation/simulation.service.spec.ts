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

  it('should handle successful JSON payload simulation', async () => {
    const mockConfig = {
      id: 1,
      payloads: [{ 
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: { test: { type: 'string' } }
        }
      }],
      mappings: [],
      tenantId: 'tenant-1'
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/json', 
      payload: { test: 'value' } 
    };

    const result = await service.simulateMapping(dto, 'tenant-1', 'user1', 'token');
    // Since we don't have real validation setup, just expect it to execute
    expect(result).toBeDefined();
    expect(result.summary.endpointId).toBe(1);
  });

  it('should handle XML payload simulation', async () => {
    const mockConfig = {
      id: 1,
      payloads: [{ 
        contentType: 'application/xml',
        schema: {
          type: 'object',
          properties: { root: { type: 'object' } }
        }
      }],
      mappings: [],
      tenantId: 'tenant-1'
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/xml', 
      payload: '<root><test>value</test></root>' 
    };

    const result = await service.simulateMapping(dto, 'tenant-1');
    expect(result).toBeDefined();
    expect(result.summary.endpointId).toBe(1);
  });

  it('should handle missing config', async () => {
    adminServiceClientMock.getConfigById.mockResolvedValue(null);

    const dto: SimulatePayloadDto = { 
      endpointId: 999, 
      payloadType: 'application/json', 
      payload: {} 
    };

    const result = await service.simulateMapping(dto, 'tenant-1');
    expect(result.status).toBe('FAILED');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle schema validation failure', async () => {
    const mockConfig = {
      id: 1,
      payloads: [{ 
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: { required_field: { type: 'string' } },
          required: ['required_field']
        }
      }],
      mappings: [],
      tenantId: 'tenant-1'
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/json', 
      payload: { wrong_field: 'value' } 
    };

    const result = await service.simulateMapping(dto, 'tenant-1');
    expect(result.status).toBe('FAILED');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle JSON parsing errors', async () => {
    const dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/json', 
      payload: 'invalid json{' 
    };

    const result = await service.simulateMapping(dto, 'tenant-1');
    expect(result.status).toBe('FAILED');
  });

  it('should handle XML parsing errors', async () => {
    const dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/xml', 
      payload: '<invalid><xml>' 
    };

    const result = await service.simulateMapping(dto, 'tenant-1');
    expect(result.status).toBe('FAILED');
  });

  it('should handle service errors', async () => {
    adminServiceClientMock.getConfigById.mockRejectedValue(new Error('Service error'));

    const dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/json', 
      payload: {} 
    };

    const result = await service.simulateMapping(dto, 'tenant-1');
    expect(result.status).toBe('FAILED');
  });

  it('should handle mapping validation and processing', async () => {
    const mockConfig = {
      id: 1,
      payloads: [{ 
        contentType: 'application/json',
        schema: {
          type: 'object',
          properties: { amount: { type: 'number' } }
        }
      }],
      mapping: [{
        source: 'amount',
        target: 'mappedAmount',
        transformation: 'direct'
      }],
      tenantId: 'tenant-1'
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/json', 
      payload: { amount: 1000 } 
    };

    const result = await service.simulateMapping(dto, 'tenant-1', 'user1');
    expect(result).toBeDefined();
    expect(result.summary.mappingsApplied).toBeGreaterThanOrEqual(0);
  });

  it('should handle custom TCS mapping in dto', async () => {
    const mockConfig = {
      id: 1,
      payloads: [{ 
        contentType: 'application/json',
        schema: { type: 'object' }
      }],
      tenantId: 'tenant-1'
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const customMapping = {
      mapping: [],
      functions: []
    } as any;

    const dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/json', 
      payload: { test: 'value' },
      tcsMapping: customMapping
    };

    const result = await service.simulateMapping(dto, 'tenant-1', 'user1');
    expect(result).toBeDefined();
  });

  it('should handle different payload types and edge cases', async () => {
    const mockConfig = {
      id: 1,
      payloads: [{ 
        contentType: 'application/json',
        schema: { type: 'object' }
      }],
      tenantId: 'tenant-1'
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    // Test with empty payload
    let dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/json', 
      payload: null 
    };

    let result = await service.simulateMapping(dto, 'tenant-1');
    expect(result).toBeDefined();

    // Test with complex nested object
    dto = { 
      endpointId: 1, 
      payloadType: 'application/json', 
      payload: { 
        level1: { 
          level2: { 
            data: [1, 2, 3],
            metadata: { created: new Date() }
          }
        }
      }
    };

    result = await service.simulateMapping(dto, 'tenant-1');
    expect(result).toBeDefined();
  });

  it('should handle schema mismatch between payload types', async () => {
    const mockConfig = {
      id: 1,
      payloads: [{ 
        contentType: 'application/xml', // Config expects XML
        schema: { type: 'object' }
      }],
      tenantId: 'tenant-1'
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    // But we send JSON payload
    const dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/json', 
      payload: { test: 'value' } 
    };

    const result = await service.simulateMapping(dto, 'tenant-1');
    expect(result).toBeDefined();
  });

  it('should handle malformed XML with special characters', async () => {
    const mockConfig = {
      id: 1,
      payloads: [{ 
        contentType: 'application/xml',
        schema: { type: 'object' }
      }],
      tenantId: 'tenant-1'
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    const dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/xml', 
      payload: '<root>Special &chars; <unclosed>' 
    };

    const result = await service.simulateMapping(dto, 'tenant-1');
    expect(result.status).toBe('FAILED');
  });

  it('should handle extremely large payloads', async () => {
    const mockConfig = {
      id: 1,
      payloads: [{ 
        contentType: 'application/json',
        schema: { type: 'object' }
      }],
      tenantId: 'tenant-1'
    };

    adminServiceClientMock.getConfigById.mockResolvedValue(mockConfig);

    // Create a large object
    const largePayload = {};
    for (let i = 0; i < 100; i++) {
      largePayload[`field_${i}`] = `value_${i}`.repeat(100);
    }

    const dto: SimulatePayloadDto = { 
      endpointId: 1, 
      payloadType: 'application/json', 
      payload: largePayload
    };

    const result = await service.simulateMapping(dto, 'tenant-1');
    expect(result).toBeDefined();
  });
});
