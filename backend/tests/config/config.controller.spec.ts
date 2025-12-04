import { Test, TestingModule } from '@nestjs/testing';
import { ConfigController } from '../../src/config/config.controller';
import { ConfigService } from '../../src/config/config.service';
import { Request } from 'express';
import { ConfigStatus, ContentType } from '../../src/config/config.interfaces';
import { JSONSchema } from '@tazama-lf/tcs-lib';

describe('ConfigController', () => {
  let controller: ConfigController;
  let configService: jest.Mocked<ConfigService>;

  const mockToken = 'Bearer mock-jwt-token';
  const mockTenantId = 'test-tenant';
  const mockUserId = 'user-123';

  const mockRequest = {
    headers: {
      authorization: mockToken,
    },
    user: {
      sub: mockUserId,
      preferred_username: mockUserId,
      tenantId: mockTenantId,
      userId: mockUserId,
      roles: ['editor'],
      token: {
        tokenString: mockToken,
      },
    },
  } as unknown as Request;

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

  const mockConfig = {
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
    createdBy: mockUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      createConfig: jest.fn(),
      getConfigById: jest.fn(),
      updateConfig: jest.fn(),
      deleteConfig: jest.fn(),
      addMapping: jest.fn(),
      removeMapping: jest.fn(),
      addFunction: jest.fn(),
      removeFunction: jest.fn(),
      updateFunction: jest.fn(),
      submitForApproval: jest.fn(),
      approveConfig: jest.fn(),
      rejectConfig: jest.fn(),
      exportConfig: jest.fn(),
      deployConfig: jest.fn(),
      updateConfigStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<ConfigController>(ConfigController);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConfigById', () => {
    it('should return config by ID', async () => {
      configService.getConfigById.mockResolvedValue(mockConfig);

      const result = await controller.getConfigById(1, mockRequest);

      expect(result).toEqual(mockConfig);
      expect(configService.getConfigById).toHaveBeenCalledWith(
        1,
        mockTenantId,
        mockToken,
      );
    });

    it('should throw error if config not found', async () => {
      configService.getConfigById.mockResolvedValue(null);

      await expect(controller.getConfigById(999, mockRequest)).rejects.toThrow();
    });
  });

  describe('updateConfig', () => {
    it('should update config successfully', async () => {
      const updateDto = { endpointPath: '/new-path' };
      const updatedConfig = { ...mockConfig, endpointPath: '/new-path' };

      configService.updateConfig.mockResolvedValue({
        success: true,
        config: updatedConfig,
        message: 'Config updated successfully',
      });

      const result = await controller.updateConfig(1, updateDto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.config?.endpointPath).toBe('/new-path');
      expect(configService.updateConfig).toHaveBeenCalledWith(
        1,
        updateDto,
        mockTenantId,
        mockUserId,
        mockToken,
      );
    });
  });

  describe('deleteConfig', () => {
    it('should delete config successfully', async () => {
      configService.deleteConfig.mockResolvedValue({
        success: true,
        message: 'Config deleted successfully',
      });

      const result = await controller.deleteConfig(1, mockRequest);

      expect(result.success).toBe(true);
      expect(configService.deleteConfig).toHaveBeenCalledWith(
        1,
        mockTenantId,
        mockUserId,
        mockToken,
      );
    });
  });

  describe('addMapping', () => {
    it('should add mapping successfully', async () => {
      const mappingDto = {
        source: 'amount',
        destination: 'transactionAmount',
      };

      const configWithMapping = {
        ...mockConfig,
        mapping: [{ source: ['amount'], destination: 'transactionAmount' }],
      };

      configService.addMapping.mockResolvedValue({
        success: true,
        config: configWithMapping,
        message: 'Mapping added successfully',
      });

      const result = await controller.addMapping(1, mappingDto, mockRequest);

      expect(result.success).toBe(true);
      expect(result.config?.mapping).toHaveLength(1);
      expect(configService.addMapping).toHaveBeenCalledWith(
        1,
        mappingDto,
        mockTenantId,
        mockUserId,
        mockToken,
      );
    });
  });

  describe('removeMapping', () => {
    it('should remove mapping successfully', async () => {
      configService.removeMapping.mockResolvedValue({
        success: true,
        config: mockConfig,
        message: 'Mapping removed successfully',
      });

      const result = await controller.removeMapping(1, 0, mockRequest);

      expect(result.success).toBe(true);
      expect(configService.removeMapping).toHaveBeenCalledWith(
        1,
        0,
        mockTenantId,
        mockUserId,
        mockToken,
      );
    });
  });

  describe('submitForApproval', () => {
    it('should submit config for approval', async () => {
      const dto = {
        configId: 1,
        userId: mockUserId,
        userRole: 'editor',
        comment: 'Ready for review',
      };

      configService.submitForApproval.mockResolvedValue({
        success: true,
        message: 'Configuration submitted for approval successfully',
      });

      const result = await controller.submitForApproval(1, dto, mockRequest);

      expect(result.success).toBe(true);
      expect(configService.submitForApproval).toHaveBeenCalledWith(
        1,
        dto,
        mockTenantId,
        mockUserId,
        ['editor'],
        mockToken,
      );
    });
  });

  describe('approveConfig', () => {
    it('should approve config successfully', async () => {
      const approverRequest = {
        ...mockRequest,
        user: {
          ...mockRequest.user,
          roles: ['approver'],
        },
      } as unknown as Request;

      const dto = {
        configId: 1,
        userId: 'approver-123',
        userRole: 'approver',
        comment: 'Approved',
      };

      configService.approveConfig.mockResolvedValue({
        success: true,
        message: 'Configuration approved successfully',
      });

      const result = await controller.approveConfig(1, dto, approverRequest);

      expect(result.success).toBe(true);
      expect(configService.approveConfig).toHaveBeenCalled();
    });
  });

  describe('rejectConfig', () => {
    it('should reject config successfully', async () => {
      const approverRequest = {
        ...mockRequest,
        user: {
          ...mockRequest.user,
          roles: ['approver'],
        },
      } as unknown as Request;

      const dto = {
        configId: 1,
        userId: 'approver-123',
        userRole: 'approver',
        comment: 'Needs changes',
      };

      configService.rejectConfig.mockResolvedValue({
        success: true,
        message: 'Configuration rejected successfully',
      });

      const result = await controller.rejectConfig(1, dto, approverRequest);

      expect(result.success).toBe(true);
      expect(configService.rejectConfig).toHaveBeenCalled();
    });
  });

  describe('exportConfig', () => {
    it('should export config successfully', async () => {
      configService.exportConfig.mockResolvedValue({
        success: true,
        message: 'Config exported successfully',
      });

      const result = await controller.exportConfig(1, mockRequest);

      expect(result.success).toBe(true);
      expect(configService.exportConfig).toHaveBeenCalledWith(
        1,
        mockTenantId,
        mockUserId,
        mockToken,
      );
    });
  });

  describe('deployConfig', () => {
    it('should deploy config successfully', async () => {
      configService.deployConfig.mockResolvedValue({
        success: true,
        message: 'Config deployed successfully',
      });

      const result = await controller.deployConfig(1, mockRequest);

      expect(result.success).toBe(true);
      expect(configService.deployConfig).toHaveBeenCalledWith(
        1,
        mockTenantId,
        mockUserId,
        mockToken,
      );
    });
  });

  describe('updateConfigStatus', () => {
    it('should update config status to STATUS_01_IN_PROGRESS', async () => {
      const statusDto = { status: 'STATUS_01_IN_PROGRESS' };

      configService.updateConfigStatus.mockResolvedValue({
        success: true,
        message: 'Config status updated to STATUS_01_IN_PROGRESS',
      });

      const result = await controller.updateConfigStatus(
        1,
        statusDto,
        mockRequest,
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(configService.updateConfigStatus).toHaveBeenCalledWith(
        1,
        'STATUS_01_IN_PROGRESS',
        mockTenantId,
        mockUserId,
        mockToken.replace('Bearer ', ''),
      );
    });

    it('should update config status to STATUS_02_ON_HOLD', async () => {
      const statusDto = { status: 'STATUS_02_ON_HOLD' };

      configService.updateConfigStatus.mockResolvedValue({
        success: true,
        message: 'Config status updated to STATUS_02_ON_HOLD',
      });

      const result = await controller.updateConfigStatus(
        1,
        statusDto,
        mockRequest,
        mockToken,
      );

      expect(result.success).toBe(true);
      expect(configService.updateConfigStatus).toHaveBeenCalledWith(
        1,
        'STATUS_02_ON_HOLD',
        mockTenantId,
        mockUserId,
        mockToken.replace('Bearer ', ''),
      );
    });

    it('should throw error if status is missing', async () => {
      const statusDto = { status: '' };

      await expect(
        controller.updateConfigStatus(1, statusDto, mockRequest, mockToken),
      ).rejects.toThrow();
    });
  });
});
