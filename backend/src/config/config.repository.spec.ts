import { Test, TestingModule } from '@nestjs/testing';
import { ConfigRepository } from './config.repository';
import { AdminServiceClient } from '../services/admin-service-client.service';
import { ConfigStatus, ContentType } from './config.interfaces';

describe('ConfigRepository', () => {
  let repository: ConfigRepository;
  let adminServiceClient: jest.Mocked<AdminServiceClient>;

  const mockConfig: any = {
    id: 1,
    msgFam: 'pain',
    transactionType: 'pacs.008',
    version: 'v1',
    endpointPath: '/tenant1/v1/pain/pacs.008',
    contentType: ContentType.JSON,
    schema: { type: 'object' as const, properties: {} },
    mapping: [],
    functions: [],
    status: ConfigStatus.IN_PROGRESS,
    tenantId: 'tenant1',
    createdBy: 'user123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishing_status: 'inactive',
  };

  beforeEach(async () => {
    const mockAdminServiceClient = {
      writeConfig: jest.fn(),
      getConfigById: jest.fn(),
      getAllConfigs: jest.fn(),
      getConfigByEndpoint: jest.fn(),
      getConfigsByTransactionType: jest.fn(),
      writeConfigUpdate: jest.fn(),
      writeConfigDelete: jest.fn(),
      runRawQuery: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigRepository,
        { provide: AdminServiceClient, useValue: mockAdminServiceClient },
      ],
    }).compile();

    repository = module.get<ConfigRepository>(ConfigRepository);
    adminServiceClient = module.get(AdminServiceClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createConfig', () => {
    it('should create a config and return its id', async () => {
      const configData: any = {
        msgFam: 'pain',
        transactionType: 'pacs.008',
        version: 'v1',
        endpointPath: '/tenant1/v1/pain/pacs.008',
        contentType: ContentType.JSON,
        schema: { type: 'object' as const, properties: {} },
        mapping: [],
        functions: [],
        status: ConfigStatus.IN_PROGRESS,
        tenantId: 'tenant1',
        createdBy: 'user123',
        publishing_status: 'inactive' as const,
      };

      adminServiceClient.writeConfig.mockResolvedValue({ id: 1 });

      const result = await repository.createConfig(configData, 'mock-token');

      expect(result).toBe(1);
      expect(adminServiceClient.writeConfig).toHaveBeenCalledWith(
        configData,
        'mock-token',
      );
    });

    it('should throw error when no id is returned', async () => {
      const configData: any = {
        msgFam: 'pain',
        transactionType: 'pacs.008',
        version: 'v1',
        endpointPath: '/tenant1/v1/pain/pacs.008',
        contentType: ContentType.JSON,
        schema: { type: 'object' as const, properties: {} },
        mapping: [],
        functions: [],
        status: ConfigStatus.IN_PROGRESS,
        tenantId: 'tenant1',
        createdBy: 'user123',
        publishing_status: 'inactive' as const,
      };

      adminServiceClient.writeConfig.mockResolvedValue({});

      await expect(
        repository.createConfig(configData, 'mock-token'),
      ).rejects.toThrow('Failed to create config: no ID returned');
    });
  });

  describe('findConfigById', () => {
    it('should return config when found with token', async () => {
      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const result = await repository.findConfigById(
        1,
        'tenant1',
        'mock-token',
      );

      expect(result).toEqual(mockConfig);
      expect(adminServiceClient.getConfigById).toHaveBeenCalledWith(
        1,
        'mock-token',
      );
    });

    it('should return config when found with tenantId (backward compatibility)', async () => {
      adminServiceClient.getConfigById.mockResolvedValue(mockConfig);

      const result = await repository.findConfigById(1, 'tenant1');

      expect(result).toEqual(mockConfig);
      expect(adminServiceClient.getConfigById).toHaveBeenCalledWith(
        1,
        'tenant1',
      );
    });

    it('should return null when config not found', async () => {
      adminServiceClient.getConfigById.mockRejectedValue(
        new Error('Not found'),
      );

      const result = await repository.findConfigById(
        999,
        'tenant1',
        'mock-token',
      );

      expect(result).toBeNull();
    });
  });

  describe('findConfigByMsgFamVersionAndTransactionType', () => {
    it('should return matching config', async () => {
      adminServiceClient.getAllConfigs.mockResolvedValue([mockConfig]);

      const result =
        await repository.findConfigByMsgFamVersionAndTransactionType(
          'pain',
          'v1',
          'pacs.008',
          'tenant1',
          'mock-token',
        );

      expect(result).toEqual(mockConfig);
    });

    it('should return null when no match found', async () => {
      adminServiceClient.getAllConfigs.mockResolvedValue([mockConfig]);

      const result =
        await repository.findConfigByMsgFamVersionAndTransactionType(
          'pain',
          'v2',
          'pacs.008',
          'tenant1',
          'mock-token',
        );

      expect(result).toBeNull();
    });

    it('should return null when service throws error', async () => {
      adminServiceClient.getAllConfigs.mockRejectedValue(
        new Error('Service error'),
      );

      const result =
        await repository.findConfigByMsgFamVersionAndTransactionType(
          'pain',
          'v1',
          'pacs.008',
          'tenant1',
          'mock-token',
        );

      expect(result).toBeNull();
    });
  });

  describe('findConfigByEndpoint', () => {
    it('should return config by endpoint path and version', async () => {
      adminServiceClient.getConfigByEndpoint.mockResolvedValue(mockConfig);

      const result = await repository.findConfigByEndpoint(
        '/tenant1/v1/pain/pacs.008',
        'v1',
        'tenant1',
        'mock-token',
      );

      expect(result).toEqual(mockConfig);
      expect(adminServiceClient.getConfigByEndpoint).toHaveBeenCalledWith(
        '/tenant1/v1/pain/pacs.008',
        'v1',
        'mock-token',
      );
    });

    it('should return null when config not found', async () => {
      adminServiceClient.getConfigByEndpoint.mockRejectedValue(
        new Error('Not found'),
      );

      const result = await repository.findConfigByEndpoint(
        '/nonexistent',
        'v1',
        'tenant1',
        'mock-token',
      );

      expect(result).toBeNull();
    });
  });

  describe('findConfigsByTenant', () => {
    it('should return all configs for tenant', async () => {
      const mockConfigs = [mockConfig];
      adminServiceClient.getAllConfigs.mockResolvedValue(mockConfigs);

      const result = await repository.findConfigsByTenant(
        'tenant1',
        'mock-token',
      );

      expect(result).toEqual(mockConfigs);
      expect(adminServiceClient.getAllConfigs).toHaveBeenCalledWith(
        'mock-token',
      );
    });

    it('should return empty array when service throws error', async () => {
      adminServiceClient.getAllConfigs.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await repository.findConfigsByTenant(
        'tenant1',
        'mock-token',
      );

      expect(result).toEqual([]);
    });

    it('should use tenantId when token not provided', async () => {
      const mockConfigs = [mockConfig];
      adminServiceClient.getAllConfigs.mockResolvedValue(mockConfigs);

      const result = await repository.findConfigsByTenant('tenant1');

      expect(result).toEqual(mockConfigs);
      expect(adminServiceClient.getAllConfigs).toHaveBeenCalledWith('tenant1');
    });
  });

  describe('findConfigsByTransactionType', () => {
    it('should return configs by transaction type', async () => {
      const mockConfigs = [mockConfig];
      adminServiceClient.getConfigsByTransactionType.mockResolvedValue(
        mockConfigs,
      );

      const result = await repository.findConfigsByTransactionType(
        'pacs.008',
        'tenant1',
        'mock-token',
      );

      expect(result).toEqual(mockConfigs);
      expect(
        adminServiceClient.getConfigsByTransactionType,
      ).toHaveBeenCalledWith('pacs.008', 'mock-token');
    });

    it('should return empty array when service throws error', async () => {
      adminServiceClient.getConfigsByTransactionType.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await repository.findConfigsByTransactionType(
        'pacs.008',
        'tenant1',
        'mock-token',
      );

      expect(result).toEqual([]);
    });
  });

  describe('findConfigByVersionAndTransactionType', () => {
    it('should return matching config', async () => {
      adminServiceClient.getAllConfigs.mockResolvedValue([mockConfig]);

      const result = await repository.findConfigByVersionAndTransactionType(
        'v1',
        'pacs.008',
        'tenant1',
        'mock-token',
      );

      expect(result).toEqual(mockConfig);
    });

    it('should return null when no match found', async () => {
      adminServiceClient.getAllConfigs.mockResolvedValue([mockConfig]);

      const result = await repository.findConfigByVersionAndTransactionType(
        'v2',
        'pacs.008',
        'tenant1',
        'mock-token',
      );

      expect(result).toBeNull();
    });

    it('should return null when service throws error', async () => {
      adminServiceClient.getAllConfigs.mockRejectedValue(
        new Error('Service error'),
      );

      const result = await repository.findConfigByVersionAndTransactionType(
        'v1',
        'pacs.008',
        'tenant1',
        'mock-token',
      );

      expect(result).toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('should update config successfully', async () => {
      const updateData = {
        msgFam: 'pain',
        version: 'v2',
      };

      adminServiceClient.writeConfigUpdate.mockResolvedValue(undefined);

      await repository.updateConfig(1, 'tenant1', updateData, 'mock-token');

      expect(adminServiceClient.writeConfigUpdate).toHaveBeenCalledWith(
        1,
        updateData,
        'mock-token',
      );
    });

    it('should handle update errors', async () => {
      const updateData = {
        msgFam: 'pain',
        version: 'v2',
      };

      adminServiceClient.writeConfigUpdate.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(
        repository.updateConfig(1, 'tenant1', updateData, 'mock-token'),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteConfig', () => {
    it('should delete config successfully', async () => {
      adminServiceClient.writeConfigDelete.mockResolvedValue(undefined);

      await repository.deleteConfig(1, 'tenant1', 'mock-token');

      expect(adminServiceClient.writeConfigDelete).toHaveBeenCalledWith(
        1,
        'mock-token',
      );
    });

    it('should handle delete errors', async () => {
      adminServiceClient.writeConfigDelete.mockRejectedValue(
        new Error('Delete failed'),
      );

      await expect(
        repository.deleteConfig(1, 'tenant1', 'mock-token'),
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('runRawQuery', () => {
    it('should execute raw SQL query', async () => {
      const query = 'SELECT * FROM config WHERE id = $1';
      const mockResult = { rows: [mockConfig], rowCount: 1 };

      adminServiceClient.runRawQuery.mockResolvedValue(mockResult);

      const result = await repository.runRawQuery(query, 'mock-token');

      expect(result).toEqual(mockResult);
      expect(adminServiceClient.runRawQuery).toHaveBeenCalledWith(
        query,
        'mock-token',
      );
    });

    it('should handle query errors', async () => {
      const query = 'INVALID SQL';

      adminServiceClient.runRawQuery.mockRejectedValue(new Error('SQL error'));

      await expect(repository.runRawQuery(query, 'mock-token')).rejects.toThrow(
        'SQL error',
      );
    });
  });
});
