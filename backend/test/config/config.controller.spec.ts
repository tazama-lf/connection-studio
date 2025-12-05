import { Test, TestingModule } from '@nestjs/testing';
import { ConfigController } from '../../src/config/config.controller';
import { ConfigService } from '../../src/config/config.service';

describe('ConfigController', () => {
  let controller: ConfigController;
  let service: any;

  const mockConfig = {
    id: 1,
    name: 'Test Config',
    tenantId: 'tenant1',
    version: '1.0.0',
  };

  const mockUser = { 
    userId: 'user1', 
    tenantId: 'tenant1', 
    roles: ['editor'],
    token: { tokenString: 'token123' },
    validated: true,
    validClaims: ['EDITOR']
  } as any;

  const mockRequest = {
    headers: { authorization: 'Bearer token123' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            getAllConfigs: jest.fn(),
            getConfigById: jest.fn(),
            createConfig: jest.fn(),
            updateConfigStatus: jest.fn(),
            deleteConfig: jest.fn(),
            deleteConfigViaWrite: jest.fn(),
            submitConfig: jest.fn(),
            approveConfig: jest.fn(),
            rejectConfig: jest.fn(),
            exportConfig: jest.fn(),
            deployConfig: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ConfigController>(ConfigController);
    service = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get all configs', async () => {
    service.getAllConfigs.mockResolvedValue([mockConfig]);
    const result = await controller.getAllConfigs('0', '10', mockUser, {});
    expect(result).toEqual([mockConfig]);
    expect(service.getAllConfigs).toHaveBeenCalledWith(0, 10, {}, 'token123');
  });

  it('should get config by id', async () => {
    service.getConfigById.mockResolvedValue({ success: true, config: mockConfig });
    const result = await controller.getConfigById(1, mockUser);
    expect(result).toEqual({ success: true, config: mockConfig });
    expect(service.getConfigById).toHaveBeenCalledWith(1, 'tenant1', 'token123');
  });

  it('should create config', async () => {
    const createDto = { 
      name: 'Test Config', 
      version: '1.0.0', 
      transactionType: 'payment',
      payload: 'test payload' 
    };
    service.createConfig.mockResolvedValue({ success: true, config: mockConfig });
    
    const result = await controller.createConfig(createDto, mockUser, mockRequest);
    expect(result.success).toBe(true);
    expect(service.createConfig).toHaveBeenCalledWith(createDto, 'tenant1', 'user1', 'token123');
  });

  it('should update config status', async () => {
    service.updateConfigStatus.mockResolvedValue({ success: true });
    
    const result = await controller.updateConfigStatus(1, 'APPROVED', mockUser, 'Bearer token123');
    expect(result.success).toBe(true);
    expect(service.updateConfigStatus).toHaveBeenCalledWith(1, 'APPROVED', 'tenant1', 'user1', 'token123');
  });

  it('should delete config', async () => {
    service.deleteConfigViaWrite = jest.fn().mockResolvedValue(undefined);
    
    await controller.deleteConfig(1, mockUser);
    expect(service.deleteConfigViaWrite).toHaveBeenCalledWith(1, 'token123');
  });

  it('should handle workflow operations', async () => {
    const workflowDto = { 
      configId: 1,
      userId: 'user1', 
      userRole: 'EDITOR',
      comment: 'Test comment' 
    };
    service.submitConfig.mockResolvedValue({ success: true });
    service.approveConfig.mockResolvedValue({ success: true });
    service.rejectConfig.mockResolvedValue({ success: true });

    await controller.submitForApproval(1, workflowDto, mockUser, 'Bearer token123');
    await controller.approveConfig(1, { ...workflowDto, userRole: 'APPROVER' }, mockUser, 'Bearer token123');
    await controller.rejectConfig(1, workflowDto, mockUser, 'Bearer token123');

    expect(service.submitConfig).toHaveBeenCalled();
    expect(service.approveConfig).toHaveBeenCalled();
    expect(service.rejectConfig).toHaveBeenCalled();
  });

  it('should handle export and deploy operations', async () => {
    const exportDto = { userId: 'user1', userRole: 'EXPORTER' };
    const deployDto = { configId: 1, userId: 'user1', userRole: 'DEPLOYER' };
    service.exportConfig.mockResolvedValue({ success: true });
    service.deployConfig.mockResolvedValue({ success: true });

    await controller.exportConfig(1, exportDto, mockUser, 'Bearer token123');
    await controller.deployConfig(1, deployDto, mockUser, 'Bearer token123');

    expect(service.exportConfig).toHaveBeenCalledWith(1, exportDto, mockUser, 'token123');
    expect(service.deployConfig).toHaveBeenCalledWith(1, deployDto, mockUser, 'tenant1', 'user1', 'token123');
  });

  it('should handle errors gracefully', async () => {
    service.getConfigById.mockRejectedValue(new Error('Config not found'));
    
    await expect(controller.getConfigById(999, mockUser)).rejects.toThrow('Config not found');
  });
});
