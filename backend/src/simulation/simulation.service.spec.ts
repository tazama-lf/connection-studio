import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';
import { ConfigRepository } from '../config/config.repository';
import { AuditService } from '../audit/audit.service';
import { Config, ContentType, ConfigStatus } from '../config/config.interfaces';

describe('SimulationService', () => {
  let service: SimulationService;
  let configRepository: jest.Mocked<ConfigRepository>;

  const mockConfig: Config = {
    id: 1,
    msgFam: 'pain.001',
    transactionType: 'Payments',
    endpointPath: '/test-tenant/v1/pain.001/Payments',
    version: 'v1',
    contentType: ContentType.JSON,
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number' },
        currency: { type: 'string' },
        // Simulate a manually added field that's in the schema but wasn't in original payload
        customerReference: { type: 'string' },
      },
      required: ['amount', 'currency'],
      additionalProperties: false,
    },
    mapping: [],
    functions: [],
    status: ConfigStatus.APPROVED,
    tenantId: 'test-tenant',
    createdBy: 'user-123',
  };

  beforeEach(async () => {
    const mockConfigRepository = {
      findConfigById: jest.fn(),
    };

    const mockAuditService = {
      logAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        {
          provide: ConfigRepository,
          useValue: mockConfigRepository,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<SimulationService>(SimulationService);
    configRepository = module.get(ConfigRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Schema Validation with Manually Added Fields', () => {
    it('should allow additional properties in payload for manually added schema fields', async () => {
      configRepository.findConfigById.mockResolvedValue(mockConfig);

      const simulateDto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: {
          amount: 100,
          currency: 'USD',
          customerReference: 'REF-12345', // This field was manually added to schema
          extraField: 'should be allowed', // Additional field should be allowed now
        },
      };

      const result = await service.simulateMapping(
        simulateDto,
        'test-tenant',
        'user-123',
      );

      // Check that the schema validation stage passes
      const schemaStage = result.stages.find(
        (stage) => stage.name === '3. Validate Schema',
      );
      expect(schemaStage).toBeDefined();
      expect(schemaStage?.status).toBe('PASSED');

      // Should not have additionalProperties errors
      const additionalPropsErrors = result.errors.filter(
        (error) =>
          error.message?.includes('additional') ||
          error.message?.includes('not allowed'),
      );
      expect(additionalPropsErrors).toHaveLength(0);
    });

    it('should validate required fields are present', async () => {
      configRepository.findConfigById.mockResolvedValue(mockConfig);

      const simulateDto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: {
          // Missing required 'amount' and 'currency' fields
          customerReference: 'REF-12345',
          extraField: 'should be allowed',
        },
      };

      const result = await service.simulateMapping(
        simulateDto,
        'test-tenant',
        'user-123',
      );

      // Should still validate required fields
      const schemaStage = result.stages.find(
        (stage) => stage.name === '3. Validate Schema',
      );
      expect(schemaStage).toBeDefined();
      expect(schemaStage?.status).toBe('FAILED');

      // Should have required field errors
      const requiredFieldErrors = result.errors.filter((error) =>
        error.message?.includes('required'),
      );
      expect(requiredFieldErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Config Not Found', () => {
    it('should fail when config is not found', async () => {
      configRepository.findConfigById.mockResolvedValue(null);

      const simulateDto = {
        endpointId: 999,
        payloadType: 'application/json' as const,
        payload: { amount: 100 },
      };

      const result = await service.simulateMapping(
        simulateDto,
        'test-tenant',
        'user-123',
      );

      expect(result.status).toBe('FAILED');
      const configStage = result.stages.find(
        (stage) => stage.name === '1. Load Configuration',
      );
      expect(configStage?.status).toBe('FAILED');
      expect(configStage?.message).toContain('Configuration not found');
    });
  });
});
