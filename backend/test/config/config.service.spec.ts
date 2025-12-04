import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '../../src/config/config.service';
import { ConfigRepository } from '../../src/config/config.repository';
import { ConfigWorkflowService } from '../../src/config/config-workflow.service';
import { JSONSchema, FieldType } from '@tazama-lf/tcs-lib';
import { TazamaDataModelService } from '../../src/tazama-data-model/tazama-data-model.service';
import { SftpService } from '../../src/sftp/sftp.service';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { NotifyService } from '../../src/notify/notify.service';
import { NotificationService } from '../../src/notification/notification.service';
import {
  Config,
  ContentType,
  ConfigStatus,
  CreateConfigDto,
  UpdateConfigDto,
  AddMappingDto,
  AddFunctionDto,
  AllowedFunctionName,
} from '../../src/config/config.interfaces';

// Mock @tazama-lf/tcs-lib functions
jest.mock('@tazama-lf/tcs-lib', () => ({
  applyFieldAdjustments: jest.fn(),
  JSONSchema: {},
  FieldType: {},
  ContentType: {
    JSON: 'application/json',
    XML: 'application/xml',
    YAML: 'application/yaml',
  },
  ConfigStatus: {
    IN_PROGRESS: 'in_progress',
    UNDER_REVIEW: 'under_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CHANGES_REQUESTED: 'changes_requested',
    DEPLOYED: 'deployed',
  },
}));

import { applyFieldAdjustments } from '@tazama-lf/tcs-lib';

const mockApplyFieldAdjustments = applyFieldAdjustments as jest.MockedFunction<
  typeof applyFieldAdjustments
>;

describe('ConfigService', () => {
  let service: ConfigService;
  let repository: jest.Mocked<ConfigRepository>;
  let workflowService: jest.Mocked<ConfigWorkflowService>;
  let tazamaDataModelService: jest.Mocked<TazamaDataModelService>;
  let sftpService: jest.Mocked<SftpService>;
  let notificationService: jest.Mocked<NotificationService>;

  // Mock token for authentication
  const mockToken = 'mock-jwt-token-for-testing';

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
      runRawQuery: jest.fn(),
    };

    const mockTazamaDataModelService = {
      validateDestinationPath: jest.fn(),
      getDestinationPaths: jest.fn(),
      getMappingSuggestions: jest.fn(),
      isValidDestinationPath: jest.fn().mockReturnValue(true),
      getFieldType: jest.fn().mockImplementation((path: string) => {
        const fieldTypes: Record<string, string> = {
          transactionAmount: 'NUMBER',
          fullName: 'STRING',
          'transaction.amount': 'NUMBER',
          'person.name': 'STRING',
          'transaction.parties': 'ARRAY',
          'person.details': 'OBJECT',
        };
        return fieldTypes[path] || 'STRING';
      }),
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
          provide: TazamaDataModelService,
          useValue: mockTazamaDataModelService,
        },
        {
          provide: ConfigWorkflowService,
          useValue: mockConfigWorkflowService,
        },
        {
          provide: SftpService,
          useValue: {
            createFile: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: NestConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test'),
          },
        },
        {
          provide: NotifyService,
          useValue: {
            sendMessage: jest.fn(),
            close: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            sendNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
    repository = module.get(ConfigRepository);
    workflowService = module.get(ConfigWorkflowService);
    tazamaDataModelService = module.get(TazamaDataModelService);
    sftpService = module.get(SftpService);
    notificationService = module.get(NotificationService);

    mockApplyFieldAdjustments.mockReturnValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConfigById', () => {
    it('should return config by ID', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);
      const result = await service.getConfigById(1, 'test-tenant', mockToken);
      expect(result).toEqual(mockConfig);
      expect(repository.findConfigById).toHaveBeenCalledWith(
        1,
        'test-tenant',
        mockToken,
      );
    });

    it('should return null if not found', async () => {
      repository.findConfigById.mockResolvedValue(null);
      const result = await service.getConfigById(999, 'test-tenant', mockToken);
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
        mockToken,
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
        mockToken,
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
        service.addMapping(1, mappingDto, 'test-tenant', 'user-123', mockToken),
      ).rejects.toThrow('Concat mapping requires at least 2 source fields');
    });

    it('should throw error if config not found', async () => {
      const mappingDto: AddMappingDto = {
        source: 'amount',
        destination: 'transactionAmount',
      };
      repository.findConfigById.mockResolvedValue(null);
      await expect(
        service.addMapping(999, mappingDto, 'test-tenant', 'user-123', mockToken),
      ).rejects.toThrow('Config with ID 999 not found');
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
        mockToken,
      );
      expect(result.success).toBe(true);
      expect(result.config?.mapping).toHaveLength(1);
    });

    it('should throw error for invalid mapping index', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);
      await expect(
        service.removeMapping(1, 5, 'test-tenant', 'user-123', mockToken),
      ).rejects.toThrow('Invalid mapping index');
    });

    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);
      await expect(
        service.removeMapping(999, 0, 'test-tenant', 'user-123', mockToken),
      ).rejects.toThrow('Config with ID 999 not found');
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
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(result.config?.endpointPath).toBe('/new-payment-path');
      expect(repository.updateConfig).toHaveBeenCalled();
    });

    it('should prevent editing approved config', async () => {
      const approvedConfig: Config = {
        ...mockConfig,
        status: ConfigStatus.APPROVED,
      };

      repository.findConfigById.mockResolvedValueOnce(approvedConfig);

      const result = await service.updateConfig(
        1,
        { endpointPath: '/new-path' },
        'test-tenant',
        'user-123',
        mockToken,
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Editing not allowed');
      expect(result.message).toContain('Please clone to create a new version');
      expect(repository.updateConfig).not.toHaveBeenCalled();
    });

    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);
      await expect(
        service.updateConfig(999, {}, 'test-tenant', 'user-123', mockToken),
      ).rejects.toThrow('Config with ID 999 not found');
    });
  });

  describe('deleteConfig', () => {
    it('should delete config successfully', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);
      const result = await service.deleteConfig(
        1,
        'test-tenant',
        'user-123',
        mockToken,
      );
      expect(result.success).toBe(true);
      expect(repository.deleteConfig).toHaveBeenCalledWith(
        1,
        'test-tenant',
        mockToken,
      );
    });

    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);
      await expect(
        service.deleteConfig(999, 'test-tenant', 'user-123', mockToken),
      ).rejects.toThrow('Config with ID 999 not found');
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
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Function removed successfully');
      expect(repository.updateConfig).toHaveBeenCalledWith(
        1,
        'test-tenant',
        {
          functions: [],
        },
        mockToken,
      );
    });

    it('should throw error for invalid function index', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);

      await expect(
        service.removeFunction(1, 0, 'test-tenant', 'user-123', mockToken),
      ).rejects.toThrow('Invalid function index');
    });

    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);
      await expect(
        service.removeFunction(999, 0, 'test-tenant', 'user-123', mockToken),
      ).rejects.toThrow('Config with ID 999 not found');
    });
  });

  describe('submitForApproval', () => {
    it('should allow submission without mappings', async () => {
      const configWithoutMappings: Config = {
        ...mockConfig,
        mapping: [],
        status: ConfigStatus.IN_PROGRESS,
      };

      repository.findConfigById.mockResolvedValue(configWithoutMappings);
      workflowService.canPerformAction.mockReturnValue({ canPerform: true });

      const dto = {
        configId: 1,
        userId: 'user-123',
        userRole: 'editor',
        comment: 'Submitting config without mappings',
      };

      const result = await service.submitForApproval(
        1,
        dto,
        'test-tenant',
        'user-123',
        ['editor'],
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Configuration submitted for approval successfully',
      );
      expect(repository.updateConfig).toHaveBeenCalledWith(
        1,
        'test-tenant',
        {
          status: ConfigStatus.UNDER_REVIEW,
        },
        mockToken,
      );
    });

    it('should allow submission with undefined mappings', async () => {
      const configWithEmptyMappings: Config = {
        ...mockConfig,
        mapping: undefined,
        status: ConfigStatus.IN_PROGRESS,
      };

      repository.findConfigById.mockResolvedValue(configWithEmptyMappings);
      workflowService.canPerformAction.mockReturnValue({ canPerform: true });

      const dto = {
        configId: 1,
        userId: 'user-123',
        userRole: 'editor',
        comment: 'Submitting config with undefined mappings',
      };

      const result = await service.submitForApproval(
        1,
        dto,
        'test-tenant',
        'user-123',
        ['editor'],
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Configuration submitted for approval successfully',
      );
      expect(repository.updateConfig).toHaveBeenCalledWith(
        1,
        'test-tenant',
        {
          status: ConfigStatus.UNDER_REVIEW,
        },
        mockToken,
      );
    });

    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);

      const dto = {
        configId: 999,
        userId: 'user-123',
        userRole: 'editor',
        comment: 'Test',
      };

      await expect(
        service.submitForApproval(
          999,
          dto,
          'test-tenant',
          'user-123',
          ['editor'],
          mockToken,
        ),
      ).rejects.toThrow('Config with ID 999 not found');
    });
  });

  describe('approveConfig', () => {
    it('should approve config successfully', async () => {
      const underReviewConfig: Config = {
        ...mockConfig,
        status: ConfigStatus.UNDER_REVIEW,
      };

      repository.findConfigById.mockResolvedValue(underReviewConfig);
      workflowService.canPerformAction.mockReturnValue({ canPerform: true });

      const dto = {
        configId: 1,
        userId: 'approver-123',
        userRole: 'approver',
        comment: 'Approved',
      };

      const result = await service.approveConfig(
        1,
        dto,
        'test-tenant',
        'approver-123',
        ['approver'],
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(repository.updateConfig).toHaveBeenCalledWith(
        1,
        'test-tenant',
        {
          status: ConfigStatus.APPROVED,
        },
        mockToken,
      );
    });

    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);

      const dto = {
        configId: 999,
        userId: 'approver-123',
        userRole: 'approver',
        comment: 'Approved',
      };

      await expect(
        service.approveConfig(
          999,
          dto,
          'test-tenant',
          'approver-123',
          ['approver'],
          mockToken,
        ),
      ).rejects.toThrow('Config with ID 999 not found');
    });
  });

  describe('rejectConfig', () => {
    it('should reject config successfully', async () => {
      const underReviewConfig: Config = {
        ...mockConfig,
        status: ConfigStatus.UNDER_REVIEW,
      };

      repository.findConfigById.mockResolvedValue(underReviewConfig);
      workflowService.canPerformAction.mockReturnValue({ canPerform: true });

      const dto = {
        configId: 1,
        userId: 'approver-123',
        userRole: 'approver',
        comment: 'Needs changes',
      };

      const result = await service.rejectConfig(
        1,
        dto,
        'test-tenant',
        'approver-123',
        ['approver'],
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(repository.updateConfig).toHaveBeenCalledWith(
        1,
        'test-tenant',
        {
          status: ConfigStatus.REJECTED,
        },
        mockToken,
      );
    });

    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);

      const dto = {
        configId: 999,
        userId: 'approver-123',
        userRole: 'approver',
        comment: 'Rejected',
      };

      await expect(
        service.rejectConfig(
          999,
          dto,
          'test-tenant',
          'approver-123',
          ['approver'],
          mockToken,
        ),
      ).rejects.toThrow('Config with ID 999 not found');
    });
  });

  describe('exportConfig', () => {
    it('should export config successfully', async () => {
      const approvedConfig: Config = {
        ...mockConfig,
        status: ConfigStatus.APPROVED,
      };

      repository.findConfigById.mockResolvedValue(approvedConfig);
      sftpService.createFile.mockResolvedValue(undefined);

      const result = await service.exportConfig(
        1,
        'test-tenant',
        'user-123',
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(sftpService.createFile).toHaveBeenCalled();
    });

    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);

      await expect(
        service.exportConfig(999, 'test-tenant', 'user-123', mockToken),
      ).rejects.toThrow('Config with ID 999 not found');
    });
  });

  describe('deployConfig', () => {
    it('should deploy config successfully', async () => {
      const approvedConfig: Config = {
        ...mockConfig,
        status: ConfigStatus.APPROVED,
      };

      repository.findConfigById.mockResolvedValue(approvedConfig);

      const result = await service.deployConfig(
        1,
        'test-tenant',
        'user-123',
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(repository.updateConfig).toHaveBeenCalledWith(
        1,
        'test-tenant',
        expect.objectContaining({
          publishingStatus: 'Published',
        }),
        mockToken,
      );
    });

    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);

      await expect(
        service.deployConfig(999, 'test-tenant', 'user-123', mockToken),
      ).rejects.toThrow('Config with ID 999 not found');
    });
  });

  describe('updateConfigStatus', () => {
    it('should update config status to STATUS_01_IN_PROGRESS', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);
      repository.updateConfigStatus.mockResolvedValue({
        success: true,
        message: 'Config status updated to STATUS_01_IN_PROGRESS',
      });

      const result = await service.updateConfigStatus(
        1,
        'STATUS_01_IN_PROGRESS',
        'test-tenant',
        'user-123',
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('STATUS_01_IN_PROGRESS');
      expect(repository.updateConfigStatus).toHaveBeenCalledWith(
        1,
        'STATUS_01_IN_PROGRESS',
        mockToken,
      );
    });

    it('should update config status to STATUS_02_ON_HOLD', async () => {
      repository.findConfigById.mockResolvedValue(mockConfig);
      repository.updateConfigStatus.mockResolvedValue({
        success: true,
        message: 'Config status updated to STATUS_02_ON_HOLD',
      });

      const result = await service.updateConfigStatus(
        1,
        'STATUS_02_ON_HOLD',
        'test-tenant',
        'user-123',
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('STATUS_02_ON_HOLD');
      expect(repository.updateConfigStatus).toHaveBeenCalledWith(
        1,
        'STATUS_02_ON_HOLD',
        mockToken,
      );
    });

    it('should throw error if config not found', async () => {
      repository.findConfigById.mockResolvedValue(null);

      await expect(
        service.updateConfigStatus(
          999,
          'STATUS_01_IN_PROGRESS',
          'test-tenant',
          'user-123',
          mockToken,
        ),
      ).rejects.toThrow('Config with ID 999 not found');
    });
  });
});
