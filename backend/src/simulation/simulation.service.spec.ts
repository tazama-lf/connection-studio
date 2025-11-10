import { Test, TestingModule } from '@nestjs/testing';
import { SimulationService } from './simulation.service';
import { ConfigRepository } from '../config/config.repository';
import { AuditService } from '../audit/audit.service';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { Config, ContentType, ConfigStatus } from '../config/config.interfaces';

describe('SimulationService', () => {
  let service: SimulationService;
  let configRepository: jest.Mocked<ConfigRepository>;
  let adminServiceClient: jest.Mocked<AdminServiceClient>;

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

    const mockAdminServiceClient = {
      forwardRequest: jest.fn(),
      getConfigById: jest.fn().mockResolvedValue(mockConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SimulationService,
        {
          provide: AdminServiceClient,
          useValue: mockAdminServiceClient,
        },
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
    adminServiceClient = module.get(AdminServiceClient);
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
        'test-token',
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
        'test-token',
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
      adminServiceClient.getConfigById.mockResolvedValue(null);

      const simulateDto = {
        endpointId: 999,
        payloadType: 'application/json' as const,
        payload: { amount: 100 },
      };

      const result = await service.simulateMapping(
        simulateDto,
        'test-tenant',
        'user-123',
        'test-token',
      );

      expect(result.status).toBe('FAILED');
      const configStage = result.stages.find(
        (stage) => stage.name === '1. Load Configuration',
      );
      expect(configStage?.status).toBe('FAILED');
      expect(configStage?.message).toContain('Configuration not found');
    });
  });

  describe('Transformation Preview', () => {
    it('should show transformed values in simulation preview', async () => {
      const configWithTransformations: Config = {
        ...mockConfig,
        mapping: [
          {
            source: ['firstName', 'lastName'],
            destination: 'fullName',
            transformation: 'CONCAT',
            delimiter: ' ',
          },
          {
            source: ['price', 'quantity'],
            destination: 'totalAmount',
            transformation: 'MATH',
            operator: 'MULTIPLY',
          },
          {
            source: ['amount'],
            destination: 'formattedAmount',
            transformation: 'NONE',
            prefix: '$',
          },
          {
            destination: 'category',
            transformation: 'CONSTANT',
            constantValue: 'payment',
          },
          {
            source: ['item1', 'item2', 'item3'],
            destination: 'itemsList',
            transformation: 'CONCAT',
            delimiter: ', ',
          },
          {
            source: ['value1', 'value2'],
            destination: 'sumTotal',
            transformation: 'SUM',
          },
        ],
        schema: {
          type: 'object',
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            price: { type: 'number' },
            quantity: { type: 'number' },
            amount: { type: 'number' },
            item1: { type: 'string' },
            item2: { type: 'string' },
            item3: { type: 'string' },
            value1: { type: 'number' },
            value2: { type: 'number' },
          },
          required: [],
          additionalProperties: false,
        },
      };

      configRepository.findConfigById.mockResolvedValue(
        configWithTransformations,
      );

      const dto = {
        endpointId: 1,
        payloadType: 'application/json' as const,
        payload: {
          firstName: 'John',
          lastName: 'Doe',
          price: 10.5,
          quantity: 3,
          amount: 100,
          item1: 'apple',
          item2: 'banana',
          item3: 'orange',
          value1: 25,
          value2: 15,
        },
      };

      const result = await service.simulateMapping(
        dto,
        'test-tenant',
        'user-123',
        'test-token',
      );

      expect(result.status).toBe('PASSED');

      // Check that transformedPayload contains mapping details
      expect(result.transformedPayload).toBeDefined();
      expect(result.transformedPayload.mappings).toBeDefined();

      const mappingDetails = result.transformedPayload.mappings;

      // Check CONCAT transformation
      const concatMapping = mappingDetails?.find(
        (detail) => detail.destination === 'fullName',
      );
      expect(concatMapping?.resultValue).toBe('John Doe');
      expect(concatMapping?.transformation).toBe('CONCAT');

      // Check MATH transformation
      const mathMapping = mappingDetails?.find(
        (detail) => detail.destination === 'totalAmount',
      );
      expect(mathMapping?.resultValue).toBe(31.5); // 10.5 * 3
      expect(mathMapping?.transformation).toBe('MATH');

      // Check prefix transformation
      const prefixMapping = mappingDetails?.find(
        (detail) => detail.destination === 'formattedAmount',
      );
      expect(prefixMapping?.resultValue).toBe('$100');
      expect(prefixMapping?.transformation).toBe('NONE');

      // Check CONSTANT transformation
      const constantMapping = mappingDetails?.find(
        (detail) => detail.destination === 'category',
      );
      expect(constantMapping?.resultValue).toBe('payment');
      expect(constantMapping?.transformation).toBe('CONSTANT');

      // Check multi-value CONCAT
      const itemsMapping = mappingDetails?.find(
        (detail) => detail.destination === 'itemsList',
      );
      expect(itemsMapping?.resultValue).toBe('apple, banana, orange');

      // Check SUM transformation
      const sumMapping = mappingDetails?.find(
        (detail) => detail.destination === 'sumTotal',
      );
      expect(sumMapping?.resultValue).toBe(40); // 25 + 15
      expect(sumMapping?.transformation).toBe('SUM');
    });
  });
});
