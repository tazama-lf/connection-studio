import { Test, TestingModule } from '@nestjs/testing';
import { ConfigRepository } from '../../src/config/config.repository';
import { AdminServiceClient } from '../../src/services/admin-service-client.service';
import { Config, ConfigStatus, ContentType } from '../../src/config/config.interfaces';
import { JSONSchema } from '@tazama-lf/tcs-lib';

describe('ConfigRepository', () => {
  let repository: ConfigRepository;
  let adminServiceClient: jest.Mocked<AdminServiceClient>;

  const mockToken = 'mock-jwt-token';
  const mockTenantId = 'test-tenant';

  const mockJSONSchema: JSONSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      amount: { type: 'number' },
      currency: { type: 'string' },
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
    tenantId: mockTenantId,
    createdBy: 'user-123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockAdminServiceClient = {
      writeConfig: jest.fn(),
      getConfigById: jest.fn(),
      getConfigByEndpoint: jest.fn(),
      getConfigsByTenant: jest.fn(),
      getConfigsByTransactionType: jest.fn(),
      getConfigByVersionAndTransactionType: jest.fn(),
      getConfigByMsgFamVersionAndTransactionType: jest.fn(),
      writeConfigUpdate: jest.fn(),
      writeConfigDelete: jest.fn(),
      getAllConfigs: jest.fn(),
      updateConfigStatus: jest.fn(),
      updatePublishingStatus: jest.fn(),
      forwardRequest: jest.fn(),
      runRawQuery: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigRepository,
        {
          provide: AdminServiceClient,
          useValue: mockAdminServiceClient,
        },
      ],
    }).compile();

    repository = module.get<ConfigRepository>(ConfigRepository);
    adminServiceClient = module.get(AdminServiceClient);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createConfig', () => {
    it('should create config and return ID', async () => {
      adminServiceClient.writeConfig.mockResolvedValue({ id: 1 });

      const result = await repository.createConfig(mockConfig, mockToken);

      expect(result).toBe(1);
      expect(adminServiceClient.writeConfig).toHaveBeenCalledWith(
        mockConfig,
        mockToken,
      );
    });

    it('should handle creation errors', async () => {
      adminServiceClient.writeConfig.mockRejectedValue(
        new Error('Creation failed'),
      );

      await expect(
        repository.createConfig(mockConfig, mockToken),
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('findConfigById', () => {
    it('should find config by ID', async () => {
      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const result = await repository.findConfigById(
        1,
        mockTenantId,
        mockToken,
      );

      expect(result).toEqual(mockConfig);
      expect(adminServiceClient.getConfigById).toHaveBeenCalledWith(
        1,
        mockToken,
      );
    });

    it('should return null if config not found', async () => {
      adminServiceClient.getConfigById.mockResolvedValue(null);

      const result = await repository.findConfigById(
        999,
        mockTenantId,
        mockToken,
      );

      expect(result).toBeNull();
    });
  });

  describe('updateConfigStatus', () => {
    it('should update config status successfully', async () => {
      const status = 'STATUS_01_IN_PROGRESS';
      adminServiceClient.writeConfigUpdate.mockResolvedValue(undefined);

      await repository.updateConfigStatus(1, status, mockToken);

      expect(adminServiceClient.writeConfigUpdate).toHaveBeenCalledWith(
        1,
        { status },
        mockToken,
      );
    });

    it('should handle status update errors', async () => {
      adminServiceClient.writeConfigUpdate.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(
        repository.updateConfigStatus(1, 'STATUS_02_ON_HOLD', mockToken),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteConfig', () => {
    it('should delete config successfully', async () => {
      adminServiceClient.writeConfigDelete.mockResolvedValue(undefined);

      await repository.deleteConfig(1, mockTenantId, mockToken);

      expect(adminServiceClient.writeConfigDelete).toHaveBeenCalledWith(
        1,
        mockToken,
      );
    });

    it('should handle deletion errors', async () => {
      adminServiceClient.writeConfigDelete.mockRejectedValue(
        new Error('Deletion failed'),
      );

      await expect(
        repository.deleteConfig(1, mockTenantId, mockToken),
      ).rejects.toThrow('Deletion failed');
    });
  });

  describe('findConfigByMsgFamVersionAndTransactionType', () => {
    it('should find config by msgFam, version, and transaction type', async () => {
      adminServiceClient.getAllConfigs.mockResolvedValue({
        configs: [mockConfig],
      });

      const result = await repository.findConfigByMsgFamVersionAndTransactionType(
        'pain.001',
        'v1',
        'Payments',
        mockTenantId,
        mockToken,
      );

      expect(result).toEqual(mockConfig);
      expect(adminServiceClient.getAllConfigs).toHaveBeenCalledWith(mockToken);
    });

    it('should return null if no matching config found', async () => {
      adminServiceClient.getAllConfigs.mockResolvedValue({
        configs: [],
      });

      const result = await repository.findConfigByMsgFamVersionAndTransactionType(
        'pain.999',
        'v1',
        'Payments',
        mockTenantId,
        mockToken,
      );

      expect(result).toBeNull();
    });
  });
});
