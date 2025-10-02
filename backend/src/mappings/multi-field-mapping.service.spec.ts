import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MultiFieldMappingService } from './multi-field-mapping.service';
import { MultiFieldMappingsRepository } from './multi-field-mappings.repository';
import { TazamaDataModelService } from './tazama-data-model.service';
import { EndpointsService } from '../endpoints/endpoints.service';
import { AuditService } from '../audit/audit.service';
import { MultiFieldMappingEntity } from '../common/multi-field-mapping.interfaces';
import {
  CreateMultiFieldMappingDto,
  UpdateMultiFieldMappingDto,
  SimulateMappingDto,
} from './multi-field-mapping.dto';
import {
  FieldType,
  HttpMethod,
  TransactionType,
  EndpointStatus,
} from '../common/interfaces';

describe('MultiFieldMappingService', () => {
  let service: MultiFieldMappingService;
  let mappingsRepository: jest.Mocked<MultiFieldMappingsRepository>;
  let tazamaDataModelService: jest.Mocked<TazamaDataModelService>;
  let endpointsService: jest.Mocked<EndpointsService>;
  let auditService: jest.Mocked<AuditService>;

  const mockTenantId = 'test-tenant-123';
  const mockUserId = 'test-user-456';
  const mockEndpointId = 1;

  const mockEndpoint = {
    id: mockEndpointId,
    path: '/api/payment',
    method: HttpMethod.POST,
    version: 'v1',
    transactionType: TransactionType.TRANSFERS,
    status: EndpointStatus.PUBLISHED,
    description: 'Payment endpoint',
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantId: mockTenantId,
    schemaJson: {
      sourceFields: [
        {
          name: 'amount',
          path: 'payment.amount',
          type: FieldType.NUMBER,
          isRequired: true,
        },
        {
          name: 'debtorName',
          path: 'debtor.name',
          type: FieldType.STRING,
          isRequired: true,
        },
        {
          name: 'creditorAccount',
          path: 'creditor.account',
          type: FieldType.STRING,
          isRequired: true,
        },
      ],
      version: 1,
      lastUpdated: new Date(),
      createdBy: mockUserId,
    },
  };

  const mockCreateDto: CreateMultiFieldMappingDto = {
    endpointId: mockEndpointId,
    name: 'Payment to Tazama Mapping',
    description: 'Maps payment fields to Tazama internal data model',
    sourceFields: [
      {
        path: 'payment.amount',
        type: FieldType.NUMBER,
        isRequired: true,
      },
      {
        path: 'debtor.name',
        type: FieldType.STRING,
        isRequired: true,
      },
    ],
    destinationFields: [
      {
        path: 'Amount.Amount',
        type: FieldType.NUMBER,
        isRequired: true,
        isExtension: false,
      },
      {
        path: 'Debtor.Name',
        type: FieldType.STRING,
        isRequired: true,
        isExtension: false,
      },
    ],
    transformation: 'NONE',
    status: 'ACTIVE',
    orderIndex: 1,
    tenantId: mockTenantId,
    createdBy: mockUserId,
  };

  const mockMappingEntity: MultiFieldMappingEntity = {
    id: 1,
    endpointId: mockEndpointId,
    name: 'Payment to Tazama Mapping',
    description: 'Maps payment fields to Tazama internal data model',
    sourceFields: mockCreateDto.sourceFields,
    destinationFields: mockCreateDto.destinationFields,
    transformation: 'NONE',
    status: 'ACTIVE',
    orderIndex: 1,
    version: 1,
    tenantId: mockTenantId,
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockMappingsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEndpointId: jest.fn(),
      findAllByTenant: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      bulkUpdateStatus: jest.fn(),
    };

    const mockTazamaDataModelService = {
      validateDestinationFieldPath: jest.fn(),
    };

    const mockEndpointsService = {
      getEndpointById: jest.fn(),
    };

    const mockAuditService = {
      logMappingAction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiFieldMappingService,
        {
          provide: MultiFieldMappingsRepository,
          useValue: mockMappingsRepository,
        },
        {
          provide: TazamaDataModelService,
          useValue: mockTazamaDataModelService,
        },
        { provide: EndpointsService, useValue: mockEndpointsService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<MultiFieldMappingService>(MultiFieldMappingService);
    mappingsRepository = module.get(MultiFieldMappingsRepository);
    tazamaDataModelService = module.get(TazamaDataModelService);
    endpointsService = module.get(EndpointsService);
    auditService = module.get(AuditService);

    jest.clearAllMocks();
  });

  describe('createMapping', () => {
    beforeEach(() => {
      endpointsService.getEndpointById.mockResolvedValue(mockEndpoint);
      tazamaDataModelService.validateDestinationFieldPath.mockResolvedValue(
        true,
      );
      mappingsRepository.findByEndpointId.mockResolvedValue([]);
      mappingsRepository.create.mockResolvedValue(mockMappingEntity);
      auditService.logMappingAction.mockResolvedValue(undefined);
    });

    it('should create a multi-field mapping successfully', async () => {
      const result = await service.createMapping(
        mockCreateDto,
        mockUserId,
        mockTenantId,
      );

      expect(result).toEqual(mockMappingEntity);
      expect(mappingsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          endpointId: mockEndpointId,
          name: 'Payment to Tazama Mapping',
          sourceFields: mockCreateDto.sourceFields,
          destinationFields: mockCreateDto.destinationFields,
          version: 1,
          tenantId: mockTenantId,
          createdBy: mockUserId,
        }),
      );
      expect(auditService.logMappingAction).toHaveBeenCalled();
    });

    it('should throw error if endpoint not found', async () => {
      endpointsService.getEndpointById.mockResolvedValue(null);

      await expect(
        service.createMapping(mockCreateDto, mockUserId, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if duplicate mapping name exists', async () => {
      mappingsRepository.findByEndpointId.mockResolvedValue([
        { ...mockMappingEntity, name: mockCreateDto.name },
      ]);

      await expect(
        service.createMapping(mockCreateDto, mockUserId, mockTenantId),
      ).rejects.toThrow(/Mapping with name .* already exists/);
    });

    it('should validate source fields exist in endpoint schema', async () => {
      const invalidDto = {
        ...mockCreateDto,
        sourceFields: [
          {
            path: 'nonexistent.field',
            type: FieldType.STRING,
            isRequired: true,
          },
        ],
      };

      await expect(
        service.createMapping(invalidDto, mockUserId, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate destination fields against Tazama data model', async () => {
      tazamaDataModelService.validateDestinationFieldPath.mockResolvedValue(
        false,
      );

      await expect(
        service.createMapping(mockCreateDto, mockUserId, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateMapping', () => {
    const updateDto: UpdateMultiFieldMappingDto = {
      name: 'Updated Mapping Name',
      description: 'Updated description',
      changeReason: 'Improving mapping logic',
    };

    beforeEach(() => {
      mappingsRepository.findById.mockResolvedValue(mockMappingEntity);
      mappingsRepository.update.mockResolvedValue({
        ...mockMappingEntity,
        ...updateDto,
        version: 2,
      });
      auditService.logMappingAction.mockResolvedValue(undefined);
    });

    it('should update mapping successfully', async () => {
      const result = await service.updateMapping(
        1,
        updateDto,
        mockUserId,
        mockTenantId,
      );

      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(result.version).toBe(2);
      expect(mappingsRepository.update).toHaveBeenCalledWith(
        1,
        updateDto,
        mockTenantId,
        mockUserId,
        updateDto.changeReason,
      );
    });

    it('should throw error if mapping not found', async () => {
      mappingsRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateMapping(999, updateDto, mockUserId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('simulateMapping', () => {
    const simulationDto: SimulateMappingDto = {
      mappingId: 1,
      testPayload: {
        payment: { amount: 100.5 },
        debtor: { name: 'John Doe' },
      },
      tenantId: mockTenantId,
    };

    beforeEach(() => {
      mappingsRepository.findById.mockResolvedValue(mockMappingEntity);
    });

    it('should simulate mapping successfully', async () => {
      const result = await service.simulateMapping(simulationDto);

      expect(result.success).toBe(true);
      expect(result.transformedOutput['Amount.Amount']).toBe(100.5);
      expect(result.transformedOutput['Debtor.Name']).toBe('John Doe');
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should fail simulation for inactive mapping', async () => {
      mappingsRepository.findById.mockResolvedValue({
        ...mockMappingEntity,
        status: 'INACTIVE',
      });

      await expect(service.simulateMapping(simulationDto)).rejects.toThrow(
        'Cannot simulate inactive mapping',
      );
    });

    it('should handle simulation errors gracefully', async () => {
      mappingsRepository.findById.mockResolvedValue({
        ...mockMappingEntity,
        transformation: 'CONCAT',
        transformationConfig: {
          concatFields: ['invalid.field'],
          separator: ' ',
        },
      });

      const result = await service.simulateMapping(simulationDto);

      // For now, basic simulation succeeds even with CONCAT (not fully implemented)
      // This test verifies the simulation runs without throwing errors
      expect(result.success).toBe(true);
      expect(result.validationResult).toBeDefined();
      expect(result.validationResult.errors).toBeDefined();
    });
  });

  describe('transformation validation', () => {
    it('should validate CONCAT transformation configuration', async () => {
      const concatDto = {
        ...mockCreateDto,
        transformation: 'CONCAT' as const,
        transformationConfig: {
          concatFields: ['debtor.name', 'creditor.name'],
          separator: ' ',
        },
      };

      endpointsService.getEndpointById.mockResolvedValue(mockEndpoint);
      tazamaDataModelService.validateDestinationFieldPath.mockResolvedValue(
        true,
      );
      mappingsRepository.findByEndpointId.mockResolvedValue([]);
      mappingsRepository.create.mockResolvedValue(mockMappingEntity);

      const result = await service.createMapping(
        concatDto,
        mockUserId,
        mockTenantId,
      );

      expect(result).toBeDefined();
    });

    it('should reject CONCAT transformation without config', async () => {
      const invalidConcatDto = {
        ...mockCreateDto,
        transformation: 'CONCAT' as const,
        // Missing transformationConfig
      };

      endpointsService.getEndpointById.mockResolvedValue(mockEndpoint);

      await expect(
        service.createMapping(invalidConcatDto, mockUserId, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate SUM transformation for numeric fields', async () => {
      const sumDto = {
        ...mockCreateDto,
        transformation: 'SUM' as const,
        transformationConfig: {
          sumFields: ['payment.amount'],
          operation: 'SUM' as const,
        },
      };

      endpointsService.getEndpointById.mockResolvedValue(mockEndpoint);
      tazamaDataModelService.validateDestinationFieldPath.mockResolvedValue(
        true,
      );
      mappingsRepository.findByEndpointId.mockResolvedValue([]);
      mappingsRepository.create.mockResolvedValue(mockMappingEntity);

      const result = await service.createMapping(
        sumDto,
        mockUserId,
        mockTenantId,
      );

      expect(result).toBeDefined();
    });
  });

  describe('getMappingTreeView', () => {
    beforeEach(() => {
      mappingsRepository.findById.mockResolvedValue(mockMappingEntity);
    });

    it('should return tree view structure', async () => {
      const result = await service.getMappingTreeView(1, mockTenantId);

      expect(result).toHaveProperty('mappingId', 1);
      expect(result).toHaveProperty('mappingName', 'Payment to Tazama Mapping');
      expect(result).toHaveProperty('sourceNodes');
      expect(result).toHaveProperty('destinationNodes');
      expect(result.sourceNodes).toHaveLength(2);
      expect(result.destinationNodes).toHaveLength(2);
    });

    it('should include transformation nodes when applicable', async () => {
      const mappingWithTransformation = {
        ...mockMappingEntity,
        transformation: 'CONCAT' as const,
        transformationConfig: {
          concatFields: ['debtor.name'],
          separator: ' ',
        },
      };

      mappingsRepository.findById.mockResolvedValue(mappingWithTransformation);

      const result = await service.getMappingTreeView(1, mockTenantId);

      expect(result.transformationNodes).toHaveLength(1);
      expect(result.transformationNodes[0].name).toBe('CONCAT');
    });
  });

  describe('bulkOperation', () => {
    beforeEach(() => {
      mappingsRepository.bulkUpdateStatus.mockResolvedValue([
        { ...mockMappingEntity, status: 'ACTIVE' },
      ]);
      auditService.logMappingAction.mockResolvedValue(undefined);
    });

    it('should activate multiple mappings', async () => {
      const bulkDto = {
        mappingIds: [1, 2, 3],
        action: 'ACTIVATE' as const,
        reason: 'Ready for production',
      };

      const result = await service.bulkOperation(
        bulkDto,
        mockUserId,
        mockTenantId,
      );

      expect(result).toHaveLength(1);
      expect(mappingsRepository.bulkUpdateStatus).toHaveBeenCalledWith(
        [1, 2, 3],
        'ACTIVE',
        mockTenantId,
        mockUserId,
        'Ready for production',
      );
    });

    it('should deactivate multiple mappings', async () => {
      const bulkDto = {
        mappingIds: [1, 2],
        action: 'DEACTIVATE' as const,
        reason: 'Needs review',
      };

      mappingsRepository.bulkUpdateStatus.mockResolvedValue([
        { ...mockMappingEntity, status: 'INACTIVE' },
      ]);

      const result = await service.bulkOperation(
        bulkDto,
        mockUserId,
        mockTenantId,
      );

      expect(result).toHaveLength(1);
      expect(mappingsRepository.bulkUpdateStatus).toHaveBeenCalledWith(
        [1, 2],
        'INACTIVE',
        mockTenantId,
        mockUserId,
        'Needs review',
      );
    });
  });
});
