import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '../../src/config/config.service';
import { ConfigRepository } from '../../src/config/config.repository';
import { ConfigWorkflowService } from '../../src/config/config-workflow.service';
import { ConfigUtilsService } from '../../src/config/config-utils.service';
import { SftpService } from '../../src/sftp/sftp.service';
import { NotifyService } from '../../src/notify/notify.service';
import { NotificationService } from '../../src/notification/notification.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ConfigService', () => {
  let service: ConfigService;
  let repository: any;
  let workflowService: any;
  let utilsService: any;
  let notifyService: any;
  let notificationService: any;
  let sftpService: any;

  const mockConfig = {
    id: 1,
    name: 'Test Config',
    tenantId: 'tenant1',
    version: '1.0.0',
    status: 'DRAFT',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        { 
          provide: ConfigRepository, 
          useValue: { 
            findConfigById: jest.fn(),
            createConfig: jest.fn(),
            updateConfigViaWrite: jest.fn(),
            deleteConfig: jest.fn(),
            getAllConfigsWithFilters: jest.fn(),
            findConfigByMsgFamVersionAndTransactionType: jest.fn(),
            updateConfigStatus: jest.fn(),
            updatePublishingStatus: jest.fn(),
            addMapping: jest.fn(),
            removeMapping: jest.fn(),
            addFunction: jest.fn(),
            removeFunction: jest.fn(),
            updateFunction: jest.fn(),
            deleteConfigViaWrite: jest.fn(),
            getupdateConfigByStatus: jest.fn(),
            createDeployedConfig: jest.fn()
          } 
        },
        { provide: ConfigWorkflowService, useValue: { canPerformAction: jest.fn() } },
        { provide: ConfigUtilsService, useValue: { 
          generateEndpointPath: jest.fn(),
          buildDuplicateConfigMessage: jest.fn(),
          buildUserErrorMessage: jest.fn() 
        }},
        { provide: SftpService, useValue: { 
          createFile: jest.fn(), 
          deleteFile: jest.fn(),
          readFile: jest.fn()
        }},
        { provide: NotifyService, useValue: { 
          sendMessage: jest.fn(),
          notifyDems: jest.fn()
        }},
        { provide: NotificationService, useValue: { 
          sendNotification: jest.fn(),
          sendWorkflowNotification: jest.fn()
        }},
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
    repository = module.get(ConfigRepository);
    workflowService = module.get(ConfigWorkflowService);
    utilsService = module.get(ConfigUtilsService);
    notifyService = module.get(NotifyService);
    notificationService = module.get(NotificationService);
    sftpService = module.get(SftpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get config by id successfully', async () => {
    repository.findConfigById.mockResolvedValue(mockConfig);
    const result = await service.getConfigById(1, 'tenant1', 'token');
    
    expect(result).toEqual({
      success: true,
      message: 'Config retrieved successfully',
      config: mockConfig
    });
    expect(repository.findConfigById).toHaveBeenCalledWith(1, 'tenant1', 'token');
  });

  it('should throw error if config not found', async () => {
    repository.findConfigById.mockResolvedValue(null);
    await expect(service.getConfigById(999, 'tenant1', 'token')).rejects.toThrow(NotFoundException);
  });

  it('should get all configs', async () => {
    repository.getAllConfigsWithFilters.mockResolvedValue([mockConfig]);
    const result = await service.getAllConfigs(0, 10, { tenantId: 'tenant1' }, 'token');
    expect(result).toEqual([mockConfig]);
  });

  it('should create config successfully', async () => {
    const createDto = { 
      name: 'Test Config', 
      transactionType: 'payment', 
      payload: 'test payload',
      version: '1.0',
      msgFam: 'test'
    };
    repository.findConfigByMsgFamVersionAndTransactionType.mockResolvedValue(null);
    repository.createConfig.mockResolvedValue(mockConfig);
    utilsService.generateEndpointPath.mockReturnValue('/api/test');
    
    const result = await service.createConfig(createDto, 'tenant1', 'user1', 'token');
    expect(result.success).toBe(true);
  });

  it('should handle duplicate config creation', async () => {
    const createDto = { name: 'Test', transactionType: 'payment', payload: 'test', version: '1.0', msgFam: 'test' };
    repository.findConfigByMsgFamVersionAndTransactionType.mockResolvedValue(mockConfig);
    utilsService.buildDuplicateConfigMessage.mockReturnValue('Duplicate config');
    
    const result = await service.createConfig(createDto, 'tenant1', 'user1', 'token');
    expect(result.success).toBe(false);
    expect(result.message).toBe('Duplicate config');
  });

  it('should update config status', async () => {
    repository.findConfigById.mockResolvedValue(mockConfig);
    repository.updateConfigStatus.mockResolvedValue(true);
    
    const result = await service.updateConfigStatus(1, 'APPROVED', 'tenant1', 'user1', 'token');
    expect(result.success).toBe(true);
    expect(result.message).toBe('Config status updated to APPROVED');
  });

  const mockUser = {
    tenantId: 'tenant1',
    userId: 'user1',
    validClaims: ['editor']
  } as any;

  it('should handle mapping operations', async () => {
    repository.addMapping.mockResolvedValue(mockConfig);
    repository.removeMapping.mockResolvedValue(mockConfig);

    await service.addMappingViaService(1, {}, 'token');
    await service.removeMappingViaService(1, 0, 'token');

    expect(repository.addMapping).toHaveBeenCalled();
    expect(repository.removeMapping).toHaveBeenCalled();
  });

  it('should handle publishing status update', async () => {
    repository.updatePublishingStatus.mockResolvedValue({ success: true });
    notifyService.notifyDems.mockResolvedValue(true);

    const result = await service.updatePublishingStatus(1, 'active', 'tenant1', mockUser, 'token');
    expect(repository.updatePublishingStatus).toHaveBeenCalledWith(1, 'active', 'token');
    expect(notifyService.notifyDems).toHaveBeenCalled();
  });

  it('should handle publishing status failure', async () => {
    repository.updatePublishingStatus.mockResolvedValue({ success: false, message: 'Failed' });

    await expect(service.updatePublishingStatus(1, 'active', 'tenant1', mockUser, 'token'))
      .rejects.toThrow(NotFoundException);
  });

  it('should handle config write operations', async () => {
    repository.findConfigById.mockResolvedValue(mockConfig);
    repository.updateConfigViaWrite.mockResolvedValue(mockConfig);

    const result = await service.updateConfigViaWrite(1, { name: 'Updated' }, 'token');
    expect(repository.updateConfigViaWrite).toHaveBeenCalledWith(1, { name: 'Updated' }, 'token');
    expect(result).toEqual(mockConfig);
  });

});
