import './jest.setup'; // Load environment variables first
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { AdminServiceClient } from '../services/admin-service-client.service';
import {
  ContentType,
  ConfigStatus,
  CreateConfigDto,
  UpdateConfigDto,
  AddMappingDto,
  AddFunctionDto,
  ConfigResponseDto,
} from './config.interfaces';
import type { AuthenticatedUser } from '../auth/auth.types';

describe('ConfigController', () => {
  let controller: ConfigController;
  let configService: jest.Mocked<ConfigService>;
  let adminServiceClient: jest.Mocked<AdminServiceClient>;

  const mockUser = {
    userId: 'user123',
    tenantId: 'tenant1',
    validClaims: ['editor'],
    validated: { valid: true, invalidClaims: false } as any,
    token: {
      tokenString: 'mock-token',
      tenantId: 'tenant1',
      exp: Math.floor(Date.now() / 1000) + 3600,
      sid: 'session-id',
      iss: 'test-issuer',
      clientId: 'test-client',
      claims: ['editor'],
    },
  } as AuthenticatedUser;

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
    const mockConfigService = {
      createConfig: jest.fn(),
      updateStatusToExported: jest.fn(),
      exportConfig: jest.fn(),
      deployConfig: jest.fn(),
      updatePublishingStatus: jest.fn(),
    };

    const mockAdminServiceClient = {
      forwardRequest: jest.fn(),
      getConfigById: jest.fn(),
      getAllConfigs: jest.fn(),
      getConfigByEndpoint: jest.fn(),
      getConfigsByTransactionType: jest.fn(),
      writeConfig: jest.fn(),
      writeConfigUpdate: jest.fn(),
      writeConfigDelete: jest.fn(),
      runRawQuery: jest.fn(),
    };

    const mockFileParsingService = {
      parseFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigController],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AdminServiceClient, useValue: mockAdminServiceClient },
        { provide: FileParsingService, useValue: mockFileParsingService },
      ],
    })
      .overrideGuard(require('@tazama-lf/auth-lib').TazamaAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ConfigController>(ConfigController);
    configService = module.get(ConfigService);
    adminServiceClient = module.get(AdminServiceClient);
    fileParsingService = module.get(FileParsingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createConfig', () => {
    it('should create a config successfully', async () => {
      const createDto: CreateConfigDto = {
        msgFam: 'pain',
        transactionType: 'pacs.008',
        version: 'v1',
        payload: '{"test": "data"}',
        contentType: ContentType.JSON,
      };

      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Config created successfully',
        config: mockConfig,
      };

      configService.createConfig.mockResolvedValue(mockResponse);

      const result = await controller.createConfig(createDto, mockUser, {
        headers: { authorization: 'Bearer mock-token' },
      });

      expect(result.success).toBe(true);
      expect(result.config).toEqual(mockConfig);
      expect(configService.createConfig).toHaveBeenCalledWith(
        createDto,
        'tenant1',
        'user123',
        'mock-token',
      );
    });

    it('should throw BadRequestException when creation fails', async () => {
      const createDto: CreateConfigDto = {
        msgFam: 'pain',
        transactionType: 'pacs.008',
        version: 'v1',
        payload: '{"test": "data"}',
        contentType: ContentType.JSON,
      };

      configService.createConfig.mockResolvedValue({
        success: false,
        message: 'Creation failed',
      });

      await expect(
        controller.createConfig(createDto, mockUser, {
          headers: { authorization: 'Bearer mock-token' },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createConfigFromFile', () => {
    it('should create config from JSON file', async () => {
      const mockFile = {
        buffer: Buffer.from('{"test": "data"}'),
        originalname: 'test.json',
        mimetype: 'application/json',
      } as Express.Multer.File;

      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Config created successfully',
        config: mockConfig,
      };

      configService.createConfig.mockResolvedValue(mockResponse);

      const result = await controller.createConfigFromFile(
        mockFile,
        'pain',
        'pacs.008',
        'v1',
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(configService.createConfig).toHaveBeenCalled();
    });

    it('should throw BadRequestException when no file uploaded', async () => {
      await expect(
        controller.createConfigFromFile(
          null as any,
          'pain',
          'pacs.008',
          'v1',
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-detect XML content type', async () => {
      const mockFile = {
        buffer: Buffer.from('<root></root>'),
        originalname: 'test.xml',
        mimetype: 'application/xml',
      } as Express.Multer.File;

      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Config created successfully',
        config: { ...mockConfig, contentType: ContentType.XML },
      };

      configService.createConfig.mockResolvedValue(mockResponse);

      const result = await controller.createConfigFromFile(
        mockFile,
        'pain',
        'pacs.008',
        'v1',
        mockUser,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getAllConfigs', () => {
    it('should return all configs for tenant', async () => {
      const mockConfigs = [mockConfig];
      adminServiceClient.forwardRequest.mockResolvedValue(mockConfigs);

      const result = await controller.getAllConfigs(mockUser);

      expect(result).toEqual(mockConfigs);
      expect(adminServiceClient.forwardRequest).toHaveBeenCalledWith(
        'GET',
        '/v1/admin/tcs/config',
        undefined,
        expect.objectContaining({
          Authorization: 'Bearer mock-token',
          'x-tenant-id': 'tenant1',
        }),
      );
    });
  });

  describe('getConfigById', () => {
    it('should return config by id', async () => {
      adminServiceClient.forwardRequest.mockResolvedValue(mockConfig);

      const result = await controller.getConfigById(1, mockUser);

      expect(result).toEqual(mockConfig);
      expect(adminServiceClient.forwardRequest).toHaveBeenCalledWith(
        'GET',
        '/v1/admin/tcs/config/1',
        undefined,
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when config not found', async () => {
      adminServiceClient.forwardRequest.mockResolvedValue(null);

      await expect(controller.getConfigById(999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getConfigByEndpoint', () => {
    it('should return config by endpoint path and version', async () => {
      adminServiceClient.forwardRequest.mockResolvedValue(mockConfig);

      const result = await controller.getConfigByEndpoint(
        '/test/path',
        'v1',
        mockUser,
      );

      expect(result).toEqual(mockConfig);
    });

    it('should throw NotFoundException when config not found', async () => {
      adminServiceClient.forwardRequest.mockResolvedValue(null);

      await expect(
        controller.getConfigByEndpoint('/nonexistent', 'v1', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateConfig', () => {
    it('should update config successfully', async () => {
      const updateDto: UpdateConfigDto = {
        msgFam: 'pain',
        transactionType: 'pacs.008',
        version: 'v2',
      };

      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Config updated',
        config: mockConfig,
      };

      adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

      const result = await controller.updateConfig(1, updateDto, mockUser);

      expect(result).toEqual(mockResponse);
      expect(adminServiceClient.forwardRequest).toHaveBeenCalledWith(
        'PUT',
        '/v1/admin/tcs/config/1/write',
        updateDto,
        expect.any(Object),
      );
    });
  });

  describe('deleteConfig', () => {
    it('should delete config successfully', async () => {
      adminServiceClient.forwardRequest.mockResolvedValue(undefined);

      await controller.deleteConfig(1, mockUser);

      expect(adminServiceClient.forwardRequest).toHaveBeenCalledWith(
        'DELETE',
        '/v1/admin/tcs/config/1/write',
        undefined,
        expect.any(Object),
      );
    });
  });

  describe('cloneConfig', () => {
    it('should clone config successfully', async () => {
      const cloneDto: any = {
        sourceConfigId: 1,
        newVersion: 'v2',
        newTransactionType: 'pacs.009',
      };

      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Config cloned',
        config: { ...mockConfig, version: 'v2' },
      };

      adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

      const result = await controller.cloneConfig(cloneDto, mockUser);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('addMapping', () => {
    it('should add mapping to config', async () => {
      const mappingDto: AddMappingDto = {
        source: 'field1',
        destination: 'field2',
        transformation: 'NONE',
      };

      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Mapping added',
        config: mockConfig,
      };

      adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

      const result = await controller.addMapping(1, mappingDto, mockUser);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('removeMapping', () => {
    it('should remove mapping from config', async () => {
      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Mapping removed',
        config: mockConfig,
      };

      adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

      const result = await controller.removeMapping(1, 0, mockUser);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('addFunction', () => {
    it('should add function to config', async () => {
      const functionDto: AddFunctionDto = {
        functionName: 'saveTransactionDetails',
        params: ['param1', 'param2'],
      };

      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Function added',
        config: mockConfig,
      };

      adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

      const result = await controller.addFunction(1, functionDto, mockUser);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('removeFunction', () => {
    it('should remove function from config', async () => {
      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Function removed',
        config: mockConfig,
      };

      adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

      const result = await controller.removeFunction(1, 0, mockUser);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateFunction', () => {
    it('should update function in config', async () => {
      const functionDto: AddFunctionDto = {
        functionName: 'saveTransactionDetails',
        params: ['param1', 'param2', 'param3'],
      };

      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Function updated',
        config: mockConfig,
      };

      adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

      const result = await controller.updateFunction(
        1,
        0,
        functionDto,
        mockUser,
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Workflow operations', () => {
    describe('submitForApproval', () => {
      it('should submit config for approval', async () => {
        const submitDto: any = {
          comment: 'Ready for review',
        };

        const mockResponse: ConfigResponseDto = {
          success: true,
          message: 'Submitted for approval',
          config: { ...mockConfig, status: ConfigStatus.UNDER_REVIEW },
        };

        adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

        const result = await controller.submitForApproval(
          1,
          submitDto,
          mockUser,
        );

        expect(result).toEqual(mockResponse);
      });
    });

    describe('approveConfig', () => {
      it('should approve config', async () => {
        const approvalDto: any = {
          comment: 'Approved',
        };

        const mockResponse: ConfigResponseDto = {
          success: true,
          message: 'Config approved',
          config: { ...mockConfig, status: ConfigStatus.APPROVED },
        };

        adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

        const result = await controller.approveConfig(1, approvalDto, mockUser);

        expect(result).toEqual(mockResponse);
      });
    });

    describe('rejectConfig', () => {
      it('should reject config', async () => {
        const rejectionDto: any = {
          comment: 'Needs changes',
        };

        const mockResponse: ConfigResponseDto = {
          success: true,
          message: 'Config rejected',
          config: { ...mockConfig, status: ConfigStatus.REJECTED },
        };

        adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

        const result = await controller.rejectConfig(1, rejectionDto, mockUser);

        expect(result).toEqual(mockResponse);
      });
    });

    describe('exportConfig', () => {
      it('should export config to SFTP', async () => {
        const exportDto: any = {
          comment: 'Exporting to SFTP',
        };

        const mockResponse: ConfigResponseDto = {
          success: true,
          message: 'Config exported',
        };

        configService.exportConfig.mockResolvedValue(mockResponse);

        const result = await controller.exportConfig(
          1,
          exportDto,
          mockUser,
          'Bearer mock-token',
        );

        expect(result).toEqual(mockResponse);
        expect(configService.exportConfig).toHaveBeenCalledWith(
          1,
          exportDto,
          'tenant1',
          'user123',
          ['editor'],
          'mock-token',
        );
      });
    });

    describe('deployConfig', () => {
      it('should deploy config', async () => {
        const deployDto: any = {
          comment: 'Deploying to production',
        };

        const mockResponse: ConfigResponseDto = {
          success: true,
          message: 'Config deployed',
        };

        configService.deployConfig.mockResolvedValue(mockResponse);

        const result = await controller.deployConfig(
          1,
          deployDto,
          mockUser,
          'Bearer mock-token',
        );

        expect(result).toEqual(mockResponse);
        expect(configService.deployConfig).toHaveBeenCalledWith(
          1,
          deployDto,
          'tenant1',
          'user123',
          ['editor'],
          'mock-token',
        );
      });
    });

    describe('updateStatusToExported', () => {
      it('should update status to exported', async () => {
        const statusDto: any = {
          comment: 'Status updated',
        };

        const mockResponse: ConfigResponseDto = {
          success: true,
          message: 'Status updated to exported',
        };

        configService.updateStatusToExported.mockResolvedValue(mockResponse);

        const result = await controller.updateStatusToExported(
          1,
          statusDto,
          mockUser,
          'Bearer mock-token',
        );

        expect(result).toEqual(mockResponse);
      });
    });

    describe('returnToProgress', () => {
      it('should return config to progress', async () => {
        const statusDto: any = {
          comment: 'Returning to progress',
        };

        const mockResponse: ConfigResponseDto = {
          success: true,
          message: 'Returned to progress',
          config: { ...mockConfig, status: ConfigStatus.IN_PROGRESS },
        };

        adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

        const result = await controller.returnToProgress(
          1,
          statusDto,
          mockUser,
        );

        expect(result).toEqual(mockResponse);
      });
    });

    describe('getWorkflowStatus', () => {
      it('should get workflow status for config', async () => {
        const mockStatus = {
          configId: 1,
          currentStatus: ConfigStatus.IN_PROGRESS,
          availableActions: {
            canEdit: true,
            canSubmit: true,
            canApprove: false,
          },
        };

        adminServiceClient.forwardRequest.mockResolvedValue(mockStatus);

        const result = await controller.getWorkflowStatus(1, mockUser);

        expect(result).toEqual(mockStatus);
      });
    });
  });

  describe('updatePublishingStatus', () => {
    it('should update publishing status to active', async () => {
      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Publishing status updated',
        config: { ...mockConfig, publishing_status: 'active' },
      };

      configService.updatePublishingStatus.mockResolvedValue(mockResponse);

      const result = await controller.updatePublishingStatus(
        1,
        { publishing_status: 'active' },
        mockUser,
      );

      expect(result).toEqual(mockResponse);
      expect(configService.updatePublishingStatus).toHaveBeenCalledWith(
        1,
        'active',
        'tenant1',
        'user123',
        'mock-token',
      );
    });

    it('should update publishing status to inactive', async () => {
      const mockResponse: ConfigResponseDto = {
        success: true,
        message: 'Publishing status updated',
        config: { ...mockConfig, publishing_status: 'inactive' },
      };

      configService.updatePublishingStatus.mockResolvedValue(mockResponse);

      const result = await controller.updatePublishingStatus(
        1,
        { publishing_status: 'inactive' },
        mockUser,
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPendingApprovals', () => {
    it('should get pending approvals', async () => {
      const mockApprovals = [
        { ...mockConfig, status: ConfigStatus.UNDER_REVIEW },
      ];

      adminServiceClient.forwardRequest.mockResolvedValue(mockApprovals);

      const result = await controller.getPendingApprovals(mockUser);

      expect(result).toEqual(mockApprovals);
    });
  });

  describe('getConfigsByTransactionType', () => {
    it('should get configs by transaction type', async () => {
      const mockConfigs = [mockConfig];

      adminServiceClient.forwardRequest.mockResolvedValue(mockConfigs);

      const result = await controller.getConfigsByTransactionType(
        'pacs.008',
        mockUser,
      );

      expect(result).toEqual(mockConfigs);
    });
  });

  describe('updateStatus', () => {
    it('should update config status', async () => {
      const mockResponse = {
        success: true,
        message: 'Status updated',
      };

      adminServiceClient.forwardRequest.mockResolvedValue(mockResponse);

      const result = await controller.updateStatus(
        1,
        ConfigStatus.EXPORTED,
        mockUser,
      );

      expect(result).toEqual(mockResponse);
      expect(adminServiceClient.forwardRequest).toHaveBeenCalledWith(
        'PATCH',
        '/v1/admin/tcs/config/1/status',
        { status: ConfigStatus.EXPORTED },
        expect.any(Object),
      );
    });
  });
});
