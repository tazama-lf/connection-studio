import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { ConfigWorkflowService } from './config-workflow.service';
import { PayloadParsingService, JSONSchema } from '@tazama-lf/tcs-lib';
import { AuditService } from '../audit/audit.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import { TazamaDataModelService } from '../tazama-data-model/tazama-data-model.service';
import {
  Config,
  ContentType,
  ConfigStatus,
  CreateConfigDto,
  UpdateConfigDto,
  AddMappingDto,
  AddFunctionDto,
  AllowedFunctionName,
} from './config.interfaces';

describe('ConfigService', () => {
  let service: ConfigService;
  let repository: jest.Mocked<ConfigRepository>;
  let payloadParsingService: jest.Mocked<PayloadParsingService>;
  let auditService: jest.Mocked<AuditService>;
  let jsonSchemaConverter: jest.Mocked<JSONSchemaConverterService>;
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
      findConfigByMsgFamVersionAndTransactionType: jest.fn(),
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
      isValidDestinationPath: jest.fn().mockReturnValue(true),
    };
    const mockConfigWorkflowService = {
      validateStatusTransition: jest.fn(),
      validateUserPermissions: jest.fn(),
      getTargetStatus: jest.fn(),
      canPerformAction: jest.fn(),
      canEditConfig: jest.fn().mockImplementation((status: ConfigStatus) => {
        const editableStates = [
          ConfigStatus.IN_PROGRESS,
          ConfigStatus.REJECTED,
          ConfigStatus.CHANGES_REQUESTED,
        ];
        const canEdit = editableStates.includes(status);
        return {
          canEdit,
          message: canEdit
            ? undefined
            : 'Editing not allowed. Please clone to create a new version.',
        };
      }),
      getActionDescription: jest.fn(),
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
          provide: ConfigWorkflowService,
          useValue: mockConfigWorkflowService,
        },
      ],
    }).compile();
    service = module.get<ConfigService>(ConfigService);
    repository = module.get(ConfigRepository);
    payloadParsingService = module.get(PayloadParsingService);
    auditService = module.get(AuditService);
    jsonSchemaConverter = module.get(JSONSchemaConverterService);
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
      repository.findConfigByMsgFamVersionAndTransactionType.mockResolvedValue(
        existingConfig,
      );
      const result = await service.createConfig(dto, 'test-tenant', 'user-123');
      expect(result.success).toBe(false);
      expect(result.message).toBe(
        // eslint-disable-next-line quotes
        "Config with message family 'pain.001', transaction type 'Payments', and version 'v1' already exists for this tenant. Please use different values.",
      );
      expect(
        repository.findConfigByMsgFamVersionAndTransactionType,
      ).toHaveBeenCalledWith('pain.001', 'v1', 'Payments', 'test-tenant');
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
        mapping: [{ source: ['amount'], destination: 'transactionAmount' }],
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
          { source: ['amount'], destination: 'transactionAmount' },
          { source: ['currency'], destination: 'transactionCurrency' },
        ],
      };
      repository.findConfigById.mockResolvedValueOnce(configWithMapping);
      const updatedConfig = {
        ...configWithMapping,
        mapping: [{ source: ['currency'], destination: 'transactionCurrency' }],
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
    it('should update config in-place successfully', async () => {
      const updateDto: UpdateConfigDto = {
        endpointPath: '/new-payment-path',
      };
      repository.findConfigById.mockResolvedValueOnce(mockConfig);
      repository.updateConfig.mockResolvedValueOnce(undefined);
      const updatedConfig = {
        ...mockConfig,
        endpointPath: '/new-payment-path',
      };
      repository.findConfigById.mockResolvedValueOnce(updatedConfig);

      const result = await service.updateConfig(
        1,
        updateDto,
        'test-tenant',
        'user-123',
      );

      expect(result.success).toBe(true);
      expect(result.config?.endpointPath).toBe('/new-payment-path');
      expect(repository.updateConfig).toHaveBeenCalled(); // Updates same config in-place
      expect(repository.createConfig).not.toHaveBeenCalled(); // No new config created
    });

    it('should prevent editing approved config', async () => {
      console.log('ConfigStatus.APPROVED value:', ConfigStatus.APPROVED);
      console.log('ConfigStatus enum:', ConfigStatus);

      const approvedConfig: Config = {
        id: 1,
        msgFam: 'pain.001',
        transactionType: 'Payments',
        endpointPath: '/payment',
        version: 'v1',
        contentType: ContentType.JSON,
        schema: mockJSONSchema,
        mapping: undefined,
        status: ConfigStatus.APPROVED,
        tenantId: 'test-tenant',
        createdBy: 'user-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log(
        'Approved config created, status field:',
        approvedConfig.status,
      );
      repository.findConfigById.mockResolvedValueOnce(approvedConfig);

      const result = await service.updateConfig(
        1,
        { endpointPath: '/new-path' },
        'test-tenant',
        'user-123',
      );

      console.log('Result:', result);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Editing not allowed');
      expect(result.message).toContain('Please clone to create a new version');
      expect(repository.updateConfig).not.toHaveBeenCalled();
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

  describe('addFunction', () => {
    it('should add function successfully', async () => {
      const mockConfigWithFunction = {
        ...mockConfig,
        functions: [
          {
            params: ['redis.dbtrAcctId', 'transaction.tenantId'],
            functionName: 'addAccount' as AllowedFunctionName,
          },
        ],
      };

      const mockSourceFields = [
        {
          path: 'amount',
          name: 'amount',
          type: 'number' as any,
          isRequired: true,
        },
        {
          path: 'currency',
          name: 'currency',
          type: 'string' as any,
          isRequired: false,
        },
        {
          path: 'firstName',
          name: 'firstName',
          type: 'string' as any,
          isRequired: false,
        },
        {
          path: 'lastName',
          name: 'lastName',
          type: 'string' as any,
          isRequired: false,
        },
      ];

      repository.findConfigById.mockResolvedValue(mockConfig);
      repository.findConfigById
        .mockResolvedValueOnce(mockConfig)
        .mockResolvedValueOnce(mockConfigWithFunction);

      // Mock the JSON schema converter to return mock fields
      jsonSchemaConverter.convertFromJSONSchema.mockReturnValue(
        mockSourceFields,
      );

      const functionDto: AddFunctionDto = {
        params: ['dbtrAcctId', 'tenantId'],
        functionName: 'addAccount',
      };

      const result = await service.addFunction(
        1,
        functionDto,
        'test-tenant',
        'user-123',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Function added successfully');
      expect(result.config?.functions).toBeDefined();
      expect(result.config?.functions?.length).toBe(1);
      expect(repository.updateConfig).toHaveBeenCalledWith(1, 'test-tenant', {
        functions: expect.arrayContaining([
          expect.objectContaining({
            functionName: 'addAccount',
            params: ['redis.dbtrAcctId', 'transaction.tenantId'],
          }),
        ]),
      });
      expect(auditService.logAction).toHaveBeenCalledWith({
        entityType: 'FUNCTION',
        action: 'ADD_FUNCTION',
        actor: 'user-123',
        tenantId: 'test-tenant',
        endpointName: 'Config 1',
      });
    });

    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);

      const functionDto: AddFunctionDto = {
        params: ['dbtrAcctId'],
        functionName: 'addAccount',
      };

      await expect(
        service.addFunction(999, functionDto, 'test-tenant', 'user-123'),
      ).rejects.toThrow('Config with ID 999 not found');
    });

    it('should validate function data', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);

      const invalidFunctionDto: AddFunctionDto = {
        params: [],
        functionName: 'addAccount',
      };

      await expect(
        service.addFunction(1, invalidFunctionDto, 'test-tenant', 'user-123'),
      ).rejects.toThrow('Function must have at least one parameter');
    });

    it('should validate function name is one of allowed values', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);

      const invalidFunctionDto = {
        params: ['param1'],
        functionName: 'invalidFunction' as any,
      };

      await expect(
        service.addFunction(1, invalidFunctionDto, 'test-tenant', 'user-123'),
      ).rejects.toThrow(
        'Invalid function name. Only the following functions are allowed: addAccountHolder, addEntity, addAccount',
      );
    });
  });

  describe('removeFunction', () => {
    it('should remove function successfully', async () => {
      const configWithFunction = {
        ...mockConfig,
        functions: [
          {
            params: ['redis.dbtrAcctId'],
            functionName: 'addAccount' as AllowedFunctionName,
          },
        ],
      };

      repository.findConfigById.mockResolvedValue(configWithFunction);
      repository.findConfigById
        .mockResolvedValueOnce(configWithFunction)
        .mockResolvedValueOnce({
          ...configWithFunction,
          functions: [],
        });

      const result = await service.removeFunction(
        1,
        0,
        'test-tenant',
        'user-123',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Function removed successfully');
      expect(repository.updateConfig).toHaveBeenCalledWith(1, 'test-tenant', {
        functions: [],
      });
    });

    it('should throw error for invalid function index', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);

      await expect(
        service.removeFunction(1, 0, 'test-tenant', 'user-123'),
      ).rejects.toThrow('Invalid function index');
    });
  });
});
