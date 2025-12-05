import { Test, TestingModule } from '@nestjs/testing';
import { ConfigRepository } from '../../src/config/config.repository';
import { AdminServiceClient } from '../../src/services/admin-service-client.service';

describe('ConfigRepository', () => {
  let repository: ConfigRepository;
  let adminServiceClient: any;

  const mockConfig = {
    name: 'Test Config',
    tenantId: 'tenant1',
    version: '1.0.0',
    msgFam: 'test',
    transactionType: 'payment',
    endpointPath: '/api/test',
    contentType: 'application/json',
    schema: {}
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigRepository,
        {
          provide: AdminServiceClient,
          useValue: {
            runRawQuery: jest.fn(),
            updateConfigByStatus: jest.fn(),
            writeConfig: jest.fn(),
            getAllConfigsWithFilters: jest.fn(),
            getConfigById: jest.fn(),
            updateConfig: jest.fn(),
            deleteConfig: jest.fn(),
            forwardRequest: jest.fn(),
            writeConfigDelete: jest.fn(),
            getAllConfigs: jest.fn(),
            writeConfigUpdate: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<ConfigRepository>(ConfigRepository);
    adminServiceClient = module.get(AdminServiceClient);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should find config by id', async () => {
    adminServiceClient.getConfigById.mockResolvedValue(mockConfig);
    const result = await repository.findConfigById(1, 'tenant1', 'token');
    expect(result).toEqual(mockConfig);
    expect(adminServiceClient.getConfigById).toHaveBeenCalledWith(1, 'token');
  });

  it('should find all configs with filters', async () => {
    adminServiceClient.forwardRequest.mockResolvedValue([mockConfig]);
    const result = await repository.getAllConfigsWithFilters(0, 10, { tenantId: 'tenant1' }, 'token');
    expect(result).toEqual([mockConfig]);
    expect(adminServiceClient.forwardRequest).toHaveBeenCalledWith('POST', '/v1/admin/tcs/config/0/10', { tenantId: 'tenant1' }, { Authorization: 'Bearer token' });
  });

  it('should create config', async () => {
    adminServiceClient.writeConfig.mockResolvedValue({ id: 1 });
    const result = await repository.createConfig(mockConfig as any, 'token');
    expect(result).toBe(1);
    expect(adminServiceClient.writeConfig).toHaveBeenCalledWith(mockConfig, 'token');
  });

  it('should update config', async () => {
    adminServiceClient.forwardRequest.mockResolvedValue(mockConfig);
    const result = await repository.updateConfigViaWrite(1, { name: 'Updated' }, 'token');
    expect(result).toEqual(mockConfig);
    expect(adminServiceClient.forwardRequest).toHaveBeenCalledWith('PUT', '/v1/admin/tcs/config/1/write', { name: 'Updated' }, { Authorization: 'Bearer token' });
  });

  it('should delete config', async () => {
    adminServiceClient.writeConfigDelete.mockResolvedValue(undefined);
    await repository.deleteConfig(1, 'tenant1', 'token');
    expect(adminServiceClient.writeConfigDelete).toHaveBeenCalledWith(1, 'token');
  });

  it('should handle various find operations', async () => {
    adminServiceClient.getAllConfigs.mockResolvedValue({ configs: [mockConfig] });
    adminServiceClient.updateConfigByStatus.mockResolvedValue(mockConfig);
    adminServiceClient.writeConfigUpdate.mockResolvedValue(undefined);
    
    await repository.findConfigByMsgFamVersionAndTransactionType('test', '1.0.0', 'payment', 'tenant1', 'token');
    await repository.getupdateConfigByStatus(1, 'APPROVED', 'token');
    await repository.updateConfigStatus(1, 'APPROVED', 'token');

    expect(adminServiceClient.getAllConfigs).toHaveBeenCalled();
    expect(adminServiceClient.updateConfigByStatus).toHaveBeenCalled();
    expect(adminServiceClient.writeConfigUpdate).toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    adminServiceClient.getConfigById.mockRejectedValue(new Error('Database error'));
    
    await expect(repository.findConfigById(1, 'tenant1', 'token')).rejects.toThrow('Database error');
  });
});
