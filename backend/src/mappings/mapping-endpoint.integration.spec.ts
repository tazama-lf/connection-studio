import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MappingService } from './mapping.service';
import { MappingRepository } from './mapping.repository';
import { MappingStatus, TransformationType } from './mapping.entity';
import { AuditService } from '../audit/audit.service';
import { EndpointsService } from '../endpoints/endpoints.service';
import { CreateMappingDto } from './mapping.dto';
import { FieldType } from '../common/interfaces';
describe('MappingService - Endpoint Integration Tests', () => {
  let service: MappingService;
  let endpointsService: EndpointsService;
  let mappingRepository: MappingRepository;
  const mockMappingRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };
  const mockAuditService = {
    logMappingAction: jest.fn(),
  };
  const mockEndpointsService = {
    getEndpointById: jest.fn(),
  };
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MappingService,
        { provide: MappingRepository, useValue: mockMappingRepository },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EndpointsService, useValue: mockEndpointsService },
      ],
    }).compile();
    service = module.get<MappingService>(MappingService);
    endpointsService = module.get<EndpointsService>(EndpointsService);
    mappingRepository = module.get<MappingRepository>(MappingRepository);
    jest.clearAllMocks();
  });
  describe('endpoint validation', () => {
    it('should validate mapping against endpoint schema successfully', async () => {
      const mockEndpoint = {
        id: 1,
        path: '/api/test',
        method: 'POST',
        version: 'v1',
        currentSchema: {
          version: 1,
          fields: [
            {
              name: 'userId',
              path: 'userId',
              type: FieldType.STRING,
              isRequired: true,
            },
            {
              name: 'amount',
              path: 'amount',
              type: FieldType.NUMBER,
              isRequired: true,
            },
          ],
          createdBy: 'test-user',
          createdAt: new Date(),
        },
      };
      const createDto: CreateMappingDto = {
        name: 'test-mapping',
        endpointId: 1,
        sourceFields: [
          { path: 'userId', type: 'string', isRequired: true },
          { path: 'amount', type: 'number', isRequired: true },
        ],
        destinationFields: [
          { path: 'user_id', type: 'string', isRequired: true },
          { path: 'transaction_amount', type: 'number', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        createdBy: 'test-user',
      };
      const mockMapping = {
        id: 'test-id',
        name: 'test-mapping',
        version: 1,
        status: MappingStatus.IN_PROGRESS,
        endpointId: 1,
        sourceFields: createDto.sourceFields,
        destinationFields: createDto.destinationFields,
        transformation: createDto.transformation,
        constants: null,
        createdBy: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockEndpointsService.getEndpointById.mockResolvedValue(mockEndpoint);
      mockMappingRepository.create.mockResolvedValue(mockMapping);
      const result = await service.createMapping(
        createDto,
        'test-user',
        'test-tenant',
      );
      expect(endpointsService.getEndpointById).toHaveBeenCalledWith(
        1,
        'test-tenant',
      );
      expect(mappingRepository.create).toHaveBeenCalled();
      expect(result.endpointId).toBe(1);
    });
    it('should throw BadRequestException when endpoint not found', async () => {
      const createDto: CreateMappingDto = {
        name: 'test-mapping',
        endpointId: 999,
        sourceFields: [{ path: 'userId', type: 'string', isRequired: true }],
        destinationFields: [
          { path: 'user_id', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        createdBy: 'test-user',
      };
      mockEndpointsService.getEndpointById.mockResolvedValue(null);
      await expect(
        service.createMapping(createDto, 'test-user', 'test-tenant'),
      ).rejects.toThrow(BadRequestException);
      expect(endpointsService.getEndpointById).toHaveBeenCalledWith(
        999,
        'test-tenant',
      );
    });
    it('should throw BadRequestException when source field not in endpoint schema', async () => {
      const mockEndpoint = {
        id: 1,
        currentSchema: {
          version: 1,
          fields: [
            {
              name: 'userId',
              path: 'userId',
              type: 'string',
              isRequired: true,
            },
          ],
          createdBy: 'test-user',
          createdAt: new Date(),
        },
      };
      const createDto: CreateMappingDto = {
        name: 'test-mapping',
        endpointId: 1,
        sourceFields: [
          { path: 'nonexistentField', type: 'string', isRequired: true },
        ],
        destinationFields: [
          { path: 'output', type: 'string', isRequired: true },
        ],
        transformation: TransformationType.NONE,
        createdBy: 'test-user',
      };
      mockEndpointsService.getEndpointById.mockResolvedValue(mockEndpoint);
      await expect(
        service.createMapping(createDto, 'test-user', 'test-tenant'),
      ).rejects.toThrow(BadRequestException);
    });
  });
  describe('status enum alignment', () => {
    it('should support all endpoint status values', () => {
      expect(MappingStatus.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(MappingStatus.PENDING_APPROVAL).toBe('PENDING_APPROVAL');
      expect(MappingStatus.UNDER_REVIEW).toBe('UNDER_REVIEW');
      expect(MappingStatus.READY_FOR_DEPLOYMENT).toBe('READY_FOR_DEPLOYMENT');
      expect(MappingStatus.DEPLOYED).toBe('DEPLOYED');
      expect(MappingStatus.SUSPENDED).toBe('SUSPENDED');
      expect(MappingStatus.PUBLISHED).toBe('PUBLISHED');
      expect(MappingStatus.DEPRECATED).toBe('DEPRECATED');
    });
  });
  describe('transformation enum consistency', () => {
    it('should use consistent transformation enum values', () => {
      expect(TransformationType.CONCAT).toBe('CONCAT');
      expect(TransformationType.SUM).toBe('SUM');
      expect(TransformationType.SPLIT).toBe('SPLIT');
      expect(TransformationType.NONE).toBe('NONE');
    });
  });
});
