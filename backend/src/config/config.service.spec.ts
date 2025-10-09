import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { PayloadParsingService } from '../common/payload-parsing.service';
import { AuditService } from '../audit/audit.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import { TazamaDataModelService } from '../common/tazama-data-model.service';
import { DataModelExtensionService } from '../common/data-model-extension.service';
import {
  Config,
  ContentType,
  ConfigStatus,
  CreateConfigDto,
  UpdateConfigDto,
  AddMappingDto,
} from '../common/config.interfaces';
import { JSONSchema } from '../common/json-schema.interfaces';
describe('ConfigService', () => {
  let service: ConfigService;
  let repository: jest.Mocked<ConfigRepository>;
  let payloadParsingService: jest.Mocked<PayloadParsingService>;
  let auditService: jest.Mocked<AuditService>;
  const mockJSONSchema: JSONSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      amount: { type: 'number' },
      currency: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
    },
    required: ['amount'],
    additionalProperties: false,
  };
  const mockConfig: Config = {
    id: 1,
    msgFam: 'pain.001',
    transactionType: 'Payments',
    endpointPath: '/payment',
    version: 'v1',
    contentType: ContentType.JSON,
    schema: mockJSONSchema,
    mapping: undefined,
    status: ConfigStatus.IN_PROGRESS,
    tenantId: 'test-tenant',
    createdBy: 'user-123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  beforeEach(async () => {
    const mockConfigRepository = {
      createConfig: jest.fn(),
      findConfigById: jest.fn(),
      findConfigByEndpoint: jest.fn(),
      findConfigsByTenant: jest.fn(),
      findConfigsByTransactionType: jest.fn(),
      findConfigByVersionAndTransactionType: jest.fn(),
      updateConfig: jest.fn(),
      deleteConfig: jest.fn(),
    };
    const mockPayloadParsingService = {
      parsePayloadToSchema: jest.fn(),
    };
    const mockAuditService = {
      logAction: jest.fn(),
    };
    const mockJSONSchemaConverter = {
      convertToJSONSchema: jest.fn(),
      convertFromJSONSchema: jest.fn(),
    };
    const mockTazamaDataModelService = {
      validateDestinationPath: jest.fn(),
      getDestinationPaths: jest.fn(),
      getMappingSuggestions: jest.fn(),
    };
    const mockDataModelExtensionService = {
      createExtension: jest.fn(),
      getExtensions: jest.fn(),
      updateExtension: jest.fn(),
      deleteExtension: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: ConfigRepository,
          useValue: mockConfigRepository,
        },
        {
          provide: PayloadParsingService,
          useValue: mockPayloadParsingService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: JSONSchemaConverterService,
          useValue: mockJSONSchemaConverter,
        },
        {
          provide: TazamaDataModelService,
          useValue: mockTazamaDataModelService,
        },
        {
          provide: DataModelExtensionService,
          useValue: mockDataModelExtensionService,
        },
      ],
    }).compile();
    service = module.get<ConfigService>(ConfigService);
    repository = module.get(ConfigRepository);
    payloadParsingService = module.get(PayloadParsingService);
    auditService = module.get(AuditService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('createConfig', () => {
    it('should create config successfully', async () => {
      const dto: CreateConfigDto = {
        msgFam: 'pain.001',
        transactionType: 'Payments',
        payload: '{"amount":100,"currency":"USD"}',
      };
      const parsingResult = {
        success: true,
        sourceFields: [],
        jsonSchema: mockJSONSchema,
        metadata: {
          totalFields: 2,
          requiredFields: 1,
          optionalFields: 1,
          nestedLevels: 1,
          originalSize: 100,
          processingTime: 50,
        },
        validation: {
          success: true,
          errors: [],
          warnings: [],
        },
      };
      payloadParsingService.parsePayloadToSchema.mockResolvedValue(
        parsingResult,
      );
      repository.findConfigByVersionAndTransactionType.mockResolvedValue(null); // No version conflict
      repository.createConfig.mockResolvedValue(1);
      repository.findConfigById.mockResolvedValue(mockConfig);
      const result = await service.createConfig(dto, 'test-tenant', 'user-123');
      expect(result.success).toBe(true);
      expect(result.config).toEqual(mockConfig);
      expect(repository.createConfig).toHaveBeenCalled();
      expect(repository.createConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ConfigStatus.IN_PROGRESS,
        }),
      );
      expect(auditService.logAction).toHaveBeenCalledWith({
        action: 'CREATE_CONFIG',
        actor: 'user-123',
        tenantId: 'test-tenant',
        endpointName: 'pain.001 - /test-tenant/v1/pain.001/Payments',
        entityType: 'CONFIG',
      });
    });
    it('should use preferred_username for createdBy if present', async () => {
      const dto: CreateConfigDto = {
        msgFam: 'pain.002',
        transactionType: 'Payments',
        payload: '{"amount":200,"currency":"EUR"}',
      };
      const parsingResult = {
        success: true,
        sourceFields: [],
        jsonSchema: mockJSONSchema,
        metadata: {
          totalFields: 2,
          requiredFields: 1,
          optionalFields: 1,
          nestedLevels: 1,
          originalSize: 100,
          processingTime: 50,
        },
        validation: { success: true, errors: [], warnings: [] },
      };
      payloadParsingService.parsePayloadToSchema.mockResolvedValue(
        parsingResult,
      );
      repository.findConfigByVersionAndTransactionType.mockResolvedValue(null); // No version conflict
      repository.createConfig.mockResolvedValue(2);
      const configWithPreferredUsername = {
        ...mockConfig,
        id: 2,
        createdBy: 'preferred_user',
      };
      repository.findConfigById.mockResolvedValue(configWithPreferredUsername);
      const result = await service.createConfig(
        dto,
        'tenant-xyz',
        'preferred_user',
      );
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      if (result.config) {
        expect(result.config.createdBy).toBe('preferred_user');
      }
      expect(repository.createConfig).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'preferred_user' }),
      );
    });
    it('should auto-generate endpoint path with msgFam', async () => {
      const dto: CreateConfigDto = {
        msgFam: 'pain.001',
        transactionType: 'Payments',
        payload: '{"amount":100,"currency":"USD"}',
      };
      const parsingResult = {
        success: true,
        sourceFields: [],
        jsonSchema: mockJSONSchema,
        metadata: {
          totalFields: 2,
          requiredFields: 1,
          optionalFields: 1,
          nestedLevels: 1,
          originalSize: 100,
          processingTime: 50,
        },
        validation: { success: true, errors: [], warnings: [] },
      };
      payloadParsingService.parsePayloadToSchema.mockResolvedValue(
        parsingResult,
      );
      repository.findConfigByVersionAndTransactionType.mockResolvedValue(null); // No version conflict
      repository.createConfig.mockResolvedValue(3);
      const configWithAutoPath = {
        ...mockConfig,
        id: 3,
        endpointPath: '/test-tenant/v1/pain.001/Payments',
      };
      repository.findConfigById.mockResolvedValue(configWithAutoPath);
      const result = await service.createConfig(dto, 'test-tenant', 'user-123');
      expect(result.success).toBe(true);
      expect(repository.createConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          endpointPath: '/test-tenant/v1/pain.001/Payments',
        }),
      );
    });
    it('should auto-generate endpoint path without msgFam', async () => {
      const dto: CreateConfigDto = {
        transactionType: 'Payments',
        payload: '{"amount":100,"currency":"USD"}',
      };
      const parsingResult = {
        success: true,
        sourceFields: [],
        jsonSchema: mockJSONSchema,
        metadata: {
          totalFields: 2,
          requiredFields: 1,
          optionalFields: 1,
          nestedLevels: 1,
          originalSize: 100,
          processingTime: 50,
        },
        validation: { success: true, errors: [], warnings: [] },
      };
      payloadParsingService.parsePayloadToSchema.mockResolvedValue(
        parsingResult,
      );
      repository.findConfigByVersionAndTransactionType.mockResolvedValue(null); // No version conflict
      repository.createConfig.mockResolvedValue(4);
      const configWithAutoPath = {
        ...mockConfig,
        id: 4,
        endpointPath: '/test-tenant/v1/Payments',
      };
      repository.findConfigById.mockResolvedValue(configWithAutoPath);
      const result = await service.createConfig(dto, 'test-tenant', 'user-123');
      expect(result.success).toBe(true);
      expect(repository.createConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          endpointPath: '/test-tenant/v1/Payments',
        }),
      );
    });
    it('should handle parsing failure', async () => {
      const dto: CreateConfigDto = {
        msgFam: 'pain.001',
        transactionType: 'Payments',
        payload: 'invalid json',
      };
      const parsingResult = {
        success: false,
        sourceFields: [],
        jsonSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object' as const,
          properties: {},
          additionalProperties: false,
        },
        metadata: {
          totalFields: 0,
          requiredFields: 0,
          optionalFields: 0,
          nestedLevels: 0,
          originalSize: 0,
          processingTime: 0,
        },
        validation: {
          success: false,
          errors: ['Invalid JSON'],
          warnings: [],
        },
      };
      payloadParsingService.parsePayloadToSchema.mockResolvedValue(
        parsingResult,
      );
      const result = await service.createConfig(dto, 'test-tenant', 'user-123');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to parse payload');
    });
    it('should prevent duplicate version for same transaction type and tenant', async () => {
      const dto: CreateConfigDto = {
        msgFam: 'pain.001',
        transactionType: 'Payments',
        version: 'v1',
        payload: '{"amount":100,"currency":"USD"}',
      };
      const existingConfig = { ...mockConfig };
      repository.findConfigByVersionAndTransactionType.mockResolvedValue(
        existingConfig,
      );
      const result = await service.createConfig(dto, 'test-tenant', 'user-123');
      expect(result.success).toBe(false);
      expect(result.message).toBe(
        // eslint-disable-next-line quotes
        "Config with version 'v1' for transaction type 'Payments' already exists for this tenant. Please use a different version.",
      );
      expect(
        repository.findConfigByVersionAndTransactionType,
      ).toHaveBeenCalledWith('v1', 'Payments', 'test-tenant');
      expect(repository.createConfig).not.toHaveBeenCalled();
    });
    it('should validate payload is required', async () => {
      const dto: CreateConfigDto = {
        msgFam: 'pain.001',
        transactionType: 'Payments',
      };
      const result = await service.createConfig(dto, 'test-tenant', 'user-123');
      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'Payload is required. Provide either payload text or upload a file.',
      );
      expect(repository.createConfig).not.toHaveBeenCalled();
    });
  });
  describe('getConfigById', () => {
    it('should return config by ID', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);
      const result = await service.getConfigById(1, 'test-tenant');
      expect(result).toEqual(mockConfig);
      expect(repository.findConfigById).toHaveBeenCalledWith(1, 'test-tenant');
    });
    it('should return null if not found', async () => {
      repository.findConfigById.mockResolvedValue(null);
      const result = await service.getConfigById(999, 'test-tenant');
      expect(result).toBeNull();
    });
  });
  describe('addMapping', () => {
    it('should add simple mapping', async () => {
      const mappingDto: AddMappingDto = {
        source: 'amount',
        destination: 'transactionAmount',
      };
      repository.findConfigById.mockResolvedValue(mockConfig);
      const updatedConfig = {
        ...mockConfig,
        mapping: [{ source: 'amount', destination: 'transactionAmount' }],
      };
      repository.findConfigById.mockResolvedValueOnce(mockConfig);
      repository.findConfigById.mockResolvedValueOnce(updatedConfig);

      const result = await service.addMapping(
        1,
        mappingDto,
        'test-tenant',
        'user-123',
      );
      expect(result.success).toBe(true);
      expect(result.config?.mapping).toHaveLength(1);
      expect(repository.updateConfig).toHaveBeenCalled();
    });
    it('should add concat mapping', async () => {
      const mappingDto: AddMappingDto = {
        sources: ['firstName', 'lastName'],
        destination: 'fullName',
      };
      repository.findConfigById.mockResolvedValue(mockConfig);
      const updatedConfig = {
        ...mockConfig,
        mapping: [
          {
            source: ['firstName', 'lastName'],
            destination: 'fullName',
            transformation: 'CONCAT' as const,
            delimiter: ' ',
          },
        ],
      };
      repository.findConfigById.mockResolvedValueOnce(mockConfig);
      repository.findConfigById.mockResolvedValueOnce(updatedConfig);
      const result = await service.addMapping(
        1,
        mappingDto,
        'test-tenant',
        'user-123',
      );
      expect(result.success).toBe(true);
      expect(result.config?.mapping).toHaveLength(1);
    });
    it('should validate concat mapping requires at least 2 sources', async () => {
      const mappingDto: AddMappingDto = {
        sources: ['amount'],
        destination: 'total',
      };
      repository.findConfigById.mockResolvedValue(mockConfig);
      await expect(
        service.addMapping(1, mappingDto, 'test-tenant', 'user-123'),
      ).rejects.toThrow('Concat mapping requires at least 2 source fields');
    });
  });
  describe('removeMapping', () => {
    it('should remove mapping by index', async () => {
      const configWithMapping = {
        ...mockConfig,
        mapping: [
          { source: 'amount', destination: 'transactionAmount' },
          { source: 'currency', destination: 'transactionCurrency' },
        ],
      };
      repository.findConfigById.mockResolvedValueOnce(configWithMapping);
      const updatedConfig = {
        ...configWithMapping,
        mapping: [{ source: 'currency', destination: 'transactionCurrency' }],
      };
      repository.findConfigById.mockResolvedValueOnce(updatedConfig);
      const result = await service.removeMapping(
        1,
        0,
        'test-tenant',
        'user-123',
      );
      expect(result.success).toBe(true);
      expect(result.config?.mapping).toHaveLength(1);
    });
    it('should throw error for invalid mapping index', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);
      await expect(
        service.removeMapping(1, 5, 'test-tenant', 'user-123'),
      ).rejects.toThrow('Invalid mapping index');
    });
  });
  describe('updateConfig', () => {
    it('should update config successfully', async () => {
      const updateDto: UpdateConfigDto = {
        msgFam: 'pacs.008',
      };
      repository.findConfigById.mockResolvedValueOnce(mockConfig);
      const updatedConfig = { ...mockConfig, msgFam: 'pacs.008' };
      repository.findConfigById.mockResolvedValueOnce(updatedConfig);
      const result = await service.updateConfig(
        1,
        updateDto,
        'test-tenant',
        'user-123',
      );
      expect(result.success).toBe(true);
      expect(result.config?.msgFam).toBe('pacs.008');
      expect(repository.updateConfig).toHaveBeenCalled();
    });
    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);
      await expect(
        service.updateConfig(999, {}, 'test-tenant', 'user-123'),
      ).rejects.toThrow('Config with ID 999 not found');
    });
  });
  describe('deleteConfig', () => {
    it('should delete config successfully', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);
      const result = await service.deleteConfig(1, 'test-tenant', 'user-123');
      expect(result.success).toBe(true);
      expect(repository.deleteConfig).toHaveBeenCalledWith(1, 'test-tenant');
      expect(auditService.logAction).toHaveBeenCalled();
    });
    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);
      await expect(
        service.deleteConfig(999, 'test-tenant', 'user-123'),
      ).rejects.toThrow('Config with ID 999 not found');
    });
  });
});
