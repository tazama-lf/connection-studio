import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { ConfigRepository } from './config.repository';
import { PayloadParsingService, JSONSchema } from '@tazama-lf/tcs-lib';
import { AuditService } from '../audit/audit.service';
import { JSONSchemaConverterService } from '../schemas/json-schema-converter.service';
import { TazamaDataModelService } from '../data-model-extensions/tazama-data-model.service';
import { DataModelExtensionService } from '../data-model-extensions/data-model-extension.service';
import { FlowableService } from '../flowable/flowable.service';
import { ConfigLifecycleService } from './config-lifecycle.service';
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
  let flowableService: jest.Mocked<FlowableService>;
  let configLifecycleService: jest.Mocked<ConfigLifecycleService>;
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
      isValidDestinationPath: jest.fn().mockResolvedValue(true),
    };
    const mockFlowableService = {
      startWorkflowWithDraft: jest.fn(),
      startProcess: jest.fn(),
      getConfigFromProcess: jest.fn(),
      getTasks: jest.fn(),
      completeTask: jest.fn(),
      getProcessByConfigId: jest.fn(),
      getActiveProcessForConfig: jest.fn(),
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
        {
          provide: FlowableService,
          useValue: mockFlowableService,
        },
        {
          provide: ConfigLifecycleService,
          useValue: {
            validateEditPermission: jest.fn(),
            approveConfig: jest.fn(),
            rejectConfig: jest.fn(),
            checkVersionConflicts: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();
    service = module.get<ConfigService>(ConfigService);
    repository = module.get(ConfigRepository);
    payloadParsingService = module.get(PayloadParsingService);
    auditService = module.get(AuditService);
    flowableService = module.get(FlowableService);
    configLifecycleService = module.get(ConfigLifecycleService);
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

      // Mock Flowable workflow start
      flowableService.startProcess.mockResolvedValue({
        processInstanceId: 'proc-123',
        configId: 'config-456',
      });

      const result = await service.createConfig(dto, 'test-tenant', 'user-123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('Config submitted for approval');
      expect(flowableService.startProcess).toHaveBeenCalled();
      expect(auditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_CONFIG_WORKFLOW',
        }),
      );
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

      // Mock Flowable workflow start
      flowableService.startProcess.mockResolvedValue({
        processInstanceId: 'proc-2',
        configId: 'config-2',
      });

      const result = await service.createConfig(
        dto,
        'tenant-xyz',
        'preferred_user',
      );
      expect(result.success).toBe(true);
      expect(flowableService.startProcess).toHaveBeenCalled();
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

      // Mock Flowable workflow start
      flowableService.startProcess.mockResolvedValue({
        processInstanceId: 'proc-3',
        configId: 'config-3',
      });

      const result = await service.createConfig(dto, 'test-tenant', 'user-123');
      expect(result.success).toBe(true);
      expect(flowableService.startProcess).toHaveBeenCalled();
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

      // Mock Flowable workflow start
      flowableService.startProcess.mockResolvedValue({
        processInstanceId: 'proc-4',
        configId: 'config-4',
      });

      const result = await service.createConfig(dto, 'test-tenant', 'user-123');
      expect(result.success).toBe(true);
      expect(flowableService.startProcess).toHaveBeenCalled();
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

      // Mock parsing service to return success
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

      const existingConfig = { ...mockConfig, status: ConfigStatus.APPROVED };
      repository.findConfigByVersionAndTransactionType.mockResolvedValue(
        existingConfig,
      );

      // Mock Flowable service for lifecycle check - no active process
      flowableService.getActiveProcessForConfig = jest
        .fn()
        .mockResolvedValue(null);

      // Mock the conflict check to return the expected conflict
      configLifecycleService.checkVersionConflicts.mockResolvedValueOnce({
        success: false,
        message:
          'Config version already approved and deployed. Please clone to create a new version.',
        lifecycleInfo: {
          configId: 1,
          state: 'APPROVED_LOCKED' as any,
          isEditable: false,
          canClone: true,
        },
        conflictInfo: {
          hasConflict: true,
          conflictType: 'approved_config' as any,
          existingConfigId: 1,
          suggestedAction: 'clone' as any,
        },
      } as any);

      const result = await service.createConfig(dto, 'test-tenant', 'user-123');
      expect(result.success).toBe(false);
      expect(result.message).toBe(
        'Config version already approved and deployed. Please clone to create a new version.',
      );
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
      repository.findConfigByVersionAndTransactionType.mockResolvedValueOnce(
        null,
      ); // No conflict
      repository.createConfig.mockResolvedValueOnce(2); // New config ID
      const updatedConfig = { ...mockConfig, id: 2, msgFam: 'pacs.008' };
      repository.findConfigById.mockResolvedValueOnce(updatedConfig);
      const result = await service.updateConfig(
        1,
        updateDto,
        'test-tenant',
        'user-123',
      );
      expect(result.success).toBe(true);
      expect(result.config?.msgFam).toBe('pacs.008');
      expect(repository.createConfig).toHaveBeenCalled(); // Creates new config for key field changes
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
            params: ['dbtrAcctId', 'tenantId'],
            functionName: 'addAccount' as AllowedFunctionName,
          },
        ],
      };

      repository.findConfigById.mockResolvedValue(mockConfig);
      repository.findConfigById
        .mockResolvedValueOnce(mockConfig)
        .mockResolvedValueOnce(mockConfigWithFunction);

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
            params: ['dbtrAcctId', 'tenantId'],
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
        'Invalid function name. Only the following functions are allowed: addAccount, handleTransaction, AddEntity',
      );
    });
  });

  describe('removeFunction', () => {
    it('should remove function successfully', async () => {
      const configWithFunction = {
        ...mockConfig,
        functions: [
          {
            params: ['dbtrAcctId'],
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
